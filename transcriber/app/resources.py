import os
from flask import request
from flask_restx import Resource, Namespace
from .extensions import db
from .whisper_model import whisper_transcribation
from .models import Transcribation
from .api_model import transcribation_model, transcribation_input_model
from .utils import save_file

ns = Namespace('api')

@ns.route('/video')
class VideoAPI(Resource):

    @ns.expect(transcribation_input_model)
    def post(self):
        if 'file' not in request.files:
            return {"message": "Файл не получен"}, 400

        file = request.files['file']

        try:
            # Сохраняем файл и сразу запускаем транскрипцию синхронно
            filename = save_file(file)
            text = whisper_transcribation(filename)

            # Удаляем файл после транскрипции
            file_path = os.path.join('uploads', filename)
            if os.path.exists(file_path):
                os.remove(file_path)

            return {"text": text}, 200
        except Exception as e:
            return {"message": f"Ошибка: {str(e)}"}, 500
