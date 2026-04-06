from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from .models import MessageRole


# --- Auth ---

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# --- Chat ---

class MessageOut(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: int
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    messages: List[MessageOut] = []

    model_config = {"from_attributes": True}


class ConversationListItem(BaseModel):
    id: int
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    conversation_id: int
