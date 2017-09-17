from app import app

from flask import render_template


@app.route('/lessons')
def lessons():
    return render_template("lessons_main.html")


@app.route('/lessons/<lessons>')
def testpdfviewer(lessons):
    lessonspdf = lessons + '.pdf'
    return render_template("view_lessons.html", pdfName = lessonspdf)



@app.route('/')
@app.route('/index')
def index():
    return render_template("index.html")


