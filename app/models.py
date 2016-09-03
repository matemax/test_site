from app import db

class User(db.Model):
	idPerson = db.Column(db.Integer, primary_key = True, unique = True)
	personName = db.Column(db.String(120), index = True)
	photos = db.relationship('Photo', backref = 'photo', lazy = 'dynamic')
	lunaList = db.Column(db.String(120), index = True)

	def __repr__(self):
		return '<User %r>' % (self.personName)

class Photo(db.Model):
	idPhoto = db.Column(db.Integer, primary_key = True, unique = True)
	idPerson = db.Column(db.Integer, db.ForeignKey('user.idPerson'))
	img = db.Column(db.String(1000000), index = True)
	idPhotoLuna  = db.Column(db.Integer, unique = True)

	def __repr__(self):
		return '<Photo %r>' % (self.idPerson)
