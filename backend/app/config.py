from dotenv import load_dotenv, find_dotenv
import os

# find_dotenv() .env dosyasını proje ağacında yukarı doğru arayarak bulur
load_dotenv(find_dotenv(usecwd=True), override=True)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))
