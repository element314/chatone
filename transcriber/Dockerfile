FROM python:3.10-slim

RUN apt-get update && apt-get install -y ffmpeg
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
RUN pip install openai-whisper psycopg2-binary flask-sqlalchemy flask-restx flask python-dotenv

WORKDIR /app
COPY . /app

CMD ["flask", "run", "--host=0.0.0.0", "--port=4001"]