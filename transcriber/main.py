from flask import Flask
from flask_restful import Api, Resource

app = Flask(__name__)
api = Api()

class Video(Resource):
    def post(self):
        return {"message":"link start and ok"}

api.add_resource(Video, "/api/video")
api.init_app(app)

if __name__ == "__main__":
    app.run(debug=True, port=3000, host="localhost")