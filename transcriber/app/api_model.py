from flask_restx import fields

from .extensions import api 

transcribation_model = api.model("Transcribation", {
    "id": fields.Integer(description="Id для обращения в связующую таблицу"),
    "text": fields.String(description="Текствоая транскрибация с видео")
})

transcribation_input_model = api.model("TranscribationInput", {
    "id": fields.Integer(description="Id для обращения в связующую таблицу"),
    "file": fields.String(description="Файл видео или звуковая дорожка", attribute='file', example='name.mp3/.mp4')
})