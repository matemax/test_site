#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os

def make_archive(years):
    res = '<ul class="list-group">'
    files = [f for f in os.listdir('./app/static/archive/' + years) if  (f.endswith("pdf"))]
    getTex = lambda x: x[:-3] + 'tex'
    for f in files:
        res += '<li class="list-group-item list-group-item-primary">'
        res += '<a href="/archive/' + years + '/' + f + '">'
        res += f[3:-4] + '</a>' +'(<a href="/archive/' + years + '/'   + getTex(f)  + '">' + 'tex'+ '</a>)' +  '</li>\n'
    res += '</ul>'

    with open('./app/templates/archive' + years+ ".html", 'w', encoding="utf-8") as f:
        f.write(res)


def make_archive2(years):
    res = '<table class="table">\n <tbody>'
    files = [f for f in os.listdir('./app/static/archive/' + years) if  (f.endswith("pdf"))]
    countRows  = int((len(files) + 2) / 3)
    getTex = lambda x: x[:-3] + 'tex'

    for row in range(countRows):
        res += "\n<tr>"
        for i in range(3):
            if row + i * countRows >= len(files):
                res += "\n<td>\n"
                res += "\n</td>\n"
                continue
            f = files[row + i * countRows]
            res += "\n<td>\n"
            res  += '<a href="/archive/' + years + '/' + f + '">'
            res += f[:-4] + '</a>' + '(<a href="/archive/' + years + '/' + getTex(
                f) + '">' + 'tex' + '</a>)' + '\n'
            res+= "\n</td>\n"
        res += "\n</tr>"
    #
    # for count, f in enumerate(files):
    #     res += '<li class="list-group-item list-group-item-primary">'
    #     res += '<a href="/archive/' + years + '/' + f + '">'
    #     res += f[3:-4] + '</a>' +'(<a href="/archive/' + years + '/'   + getTex(f)  + '">' + 'tex'+ '</a>)' +  '</li>\n'
    res += ' </tbody>\n</table>'

    with open('./app/templates/archive' + years+ ".html", 'w', encoding="utf-8") as f:
        f.write(res)


make_archive2("2018-2019")