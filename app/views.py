from app import app

import time
import base64
import requests
import json

from datetime import datetime

from json import dumps, loads, JSONEncoder, JSONDecoder

from flask import Flask, Response, request, abort, jsonify
from flask import stream_with_context, make_response, render_template

from config import LUNA_URL

@app.route('/view/<lessons>')
def testpdfviewer(lessons):
    lessonspdf = lessons + '.pdf'
    return render_template("test.html", pdfName = lessonspdf)




@app.route('/web')
def web():
    return render_template("testcam.html")

