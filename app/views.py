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

@app.route('/files_/<filename>')
def filesHandler(filename):
    return app.send_static_file('archive/2016-2017/' + filename)


@app.route('/archive/<years>/<filename>')
def archiveFilesHandler(years, filename):
    return app.send_static_file('archive/' + years + '/' + filename)

@app.route('/archive')
def archive():
    return render_template("archive.html")

@app.route('/about')
def about():
    return render_template("about.html")

@app.route('/contacts')
def contacts():
    return render_template("contacts.html")


@app.route('/news')
def news():
    return render_template("news.html")
