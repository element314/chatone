from flask import Flask
from .extensions import api, db
from .resources import ns



def create_app():
    app = Flask(__name__)
    
    app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://gen_user:%25bFu%7B%2CWdV%29%211m%23@147.45.105.167/default_db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    api.init_app(app)
    db.init_app(app)
    
    api.add_namespace(ns)
    return app