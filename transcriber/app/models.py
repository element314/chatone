from .extensions import db 

class Transcribation (db.Model):
    __tablename__ = 'transcribations'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=True)
    
class Video (db.Model):
    id = db.Column(db.Integer, primary_key=True)
    file = db.Column(db.Text, nullable=True)