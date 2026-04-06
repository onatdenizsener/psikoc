import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from anthropic import Anthropic, APIStatusError, APIConnectionError

from ..config import ANTHROPIC_API_KEY
from ..database import SessionLocal, get_db
from .. import models, schemas
from ..auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)

BASE_SYSTEM_PROMPT = """Sen PsiKoç'sun, Türkçe konuşan empatik bir duygusal destek asistanısın.
Kullanıcıları yargılamadan dinle, sorular sor, çözüm dayatma.
Geçmiş konuşmaları hatırla ve kullanıcıyı zamanla tanı.

Önemli kurallar:
- Her zaman Türkçe yanıt ver
- Empatiyle ve sıcaklıkla yaklaş
- Kullanıcının duygularını yansıt ve doğrula
- Acele çözümler önerme, önce dinle
- Açık uçlu sorular sorarak kullanıcının kendini ifade etmesine yardımcı ol
- Profesyonel yardım gerektiren durumlarda (intihar düşüncesi, şiddet vb.) uygun kaynakları yönlendir
- Konuşma geçmişini kullanarak kullanıcıyı daha iyi tanı"""

MEMORY_UPDATE_PROMPT = """Sen bir hafıza yöneticisisin. Kullanıcının mevcut profilini ve son konuşmayı inceleyerek güncellenmiş bir özet oluştur.

Güncelleme kuralları:
- Kullanıcının adını veya tercih ettiği hitabı not et (belirtildiyse)
- Tekrar eden sorunları, endişeleri ve temaları kaydet
- Genel duygusal durumu ve değişimlerini not et
- Önemli kişisel bilgileri (ilişkiler, iş, yaşam olayları) kaydet
- 200 kelimeden kısa tut
- Maddeler hâlinde yaz, her madde "- " ile başlasın
- Eski bilgileri güncelle, çelişen bilgileri sil
- Yorum veya açıklama ekleme, yalnızca özeti döndür"""


def _build_system_prompt(user_memory: str | None) -> str:
    if not user_memory:
        return BASE_SYSTEM_PROMPT
    return (
        BASE_SYSTEM_PROMPT
        + "\n\n---\nKullanıcı hakkında önceki konuşmalardan öğrendiklerin:\n"
        + user_memory
    )


def _build_messages(db_messages: list[models.Message]) -> list[dict]:
    return [{"role": msg.role.value, "content": msg.content} for msg in db_messages]


def _generate_title(first_message: str) -> str:
    words = first_message.strip().split()[:6]
    return " ".join(words) + ("..." if len(first_message.split()) > 6 else "")


def _update_memory_task(user_id: int, conversation_id: int):
    """Background task: ask Claude to update the user's memory after each reply."""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return

        messages = (
            db.query(models.Message)
            .filter(models.Message.conversation_id == conversation_id)
            .order_by(models.Message.created_at)
            .all()
        )
        if not messages:
            return

        conv_text = "\n".join(
            f"{m.role.value.upper()}: {m.content}" for m in messages
        )

        memory_input = (
            f"Mevcut profil:\n{user.memory or '(henüz bilgi yok)'}\n\n"
            f"Son konuşma:\n{conv_text}"
        )

        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=MEMORY_UPDATE_PROMPT,
            messages=[{"role": "user", "content": memory_input}],
        )
        new_memory = response.content[0].text.strip()
        user.memory = new_memory
        db.commit()
        logger.info("Kullanıcı %s hafızası güncellendi", user_id)
    except Exception:
        logger.exception("Hafıza güncelleme hatası (user_id=%s)", user_id)
    finally:
        db.close()


@router.post("", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get or create conversation
    if payload.conversation_id:
        conversation = db.query(models.Conversation).filter(
            models.Conversation.id == payload.conversation_id,
            models.Conversation.user_id == current_user.id,
        ).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    else:
        conversation = models.Conversation(
            user_id=current_user.id,
            title=_generate_title(payload.message),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message
    user_msg = models.Message(
        conversation_id=conversation.id,
        role=models.MessageRole.user,
        content=payload.message,
    )
    db.add(user_msg)
    db.commit()

    # Build message history for Claude
    history = db.query(models.Message).filter(
        models.Message.conversation_id == conversation.id
    ).order_by(models.Message.created_at).all()

    claude_messages = _build_messages(history)
    system_prompt = _build_system_prompt(current_user.memory)

    # Call Claude API
    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=claude_messages,
        )
        reply_text = response.content[0].text
    except APIStatusError as e:
        logger.error("Anthropic API hatası | status=%s | body=%s", e.status_code, e.message)
        if e.status_code == 400 and "credit" in e.message.lower():
            raise HTTPException(status_code=503, detail="AI servisi şu anda kullanılamıyor: yetersiz kredi.")
        raise HTTPException(status_code=502, detail=f"AI servisi hatası ({e.status_code}): {e.message}")
    except APIConnectionError as e:
        logger.error("Anthropic bağlantı hatası: %s", e)
        raise HTTPException(status_code=502, detail="AI servisine bağlanılamadı.")
    except Exception as e:
        logger.exception("Beklenmedik Claude hatası")
        raise HTTPException(status_code=502, detail=f"AI servisi hatası: {str(e)}")

    # Save assistant reply
    assistant_msg = models.Message(
        conversation_id=conversation.id,
        role=models.MessageRole.assistant,
        content=reply_text,
    )
    db.add(assistant_msg)
    db.commit()

    # Update user memory in background (non-blocking)
    background_tasks.add_task(_update_memory_task, current_user.id, conversation.id)

    return {"reply": reply_text, "conversation_id": conversation.id}


@router.get("/conversations", response_model=list[schemas.ConversationListItem])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Conversation).filter(
        models.Conversation.user_id == current_user.id
    ).order_by(models.Conversation.created_at.desc()).all()


@router.get("/conversations/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id,
        models.Conversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    return conversation


@router.delete("/conversations/{conversation_id}", status_code=204)
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id,
        models.Conversation.user_id == current_user.id,
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    db.delete(conversation)
    db.commit()
