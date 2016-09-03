
// image sizes
var PHOTO_WIDTH = 240;
var PHOTO_HEIGHT = 320;

var bild = 0;
var ctrackScores = [0, 0, 0];
var lunaScores = [1, 1, 1];
var slotBusy = [0, 0, 0];
var frame = 0;
var overlayCC_;
var overlay_;
var video;


function isGoodPhoto(index) {
    return lunaScores[index] > 0;
}

function haveGoodPhotos() {
    for(var i = 0; i < lunaScores.length; i++)
        if(isGoodPhoto(i))
            return true;
}

function shouldStopCapture() {
    for(var i = 1; i < lunaScores.length; i++) {
        if(!isGoodPhoto(i))
            return false;
    }
    return true;
}


function getImageFromCanvasBase64(canvas) {
    return canvas.toDataURL('image/jpeg').replace(/data:image\/jpeg;base64,/, '')
}

function makeRequestBody(imageJson) {
    //bare = (typeof bare === 'undefined') ? false : bare;
    var x ="{\"image\":\"" + imageJson + "\"" +
           ",\"bare\":" + true +
            "}";
    return x;
}

function displayScore(index, clmScore, lunaScore) {

    var string = clmScore.toFixed(2) + ' / ' + lunaScore.toFixed(2);
    var html = "";

    if(clmScore < 0.1 || lunaScore < 0.1) {
        html = "<p class=\"text-center text-error\"><strong>" + string + "</strong></p>";
    }
    else {
        html = "<p class=\"text-center text-success\"><strong>" + string + "</strong></p>";
    }

    $("#photo" + index + "score").html(html);
}

function makePortraitPhoto(face, score) {

    var index = -1;
    for(var i = 0; i < lunaScores.length; i++) {
        if(!isGoodPhoto(i) && !slotBusy[i]) {
            index = i;
            break;
        }
    }

    if(index >= 0) {

        slotBusy[index] = 1;

        // ширина
        var wf = Math.abs(face[32][0] - face[27][0]) * 4;
        // высота
        var hf = wf / 0.75;

        var lf = Math.round(2.5 * face[27][0] - 1.5 * face[32][0]);
        var rf = lf + wf;
        var tf = Math.round(face[32][1] - hf * 0.4);
        var bf = tf + hf;

        var dx = 0;
        var dy = 0;
        var dx1 = 0;
        var dy1 = 0;

        if (tf < 0) {
            dy = Math.round(-tf * PHOTO_HEIGHT / hf);
            tf = 0;
        }
        if (lf < 0) {
            dx = Math.round(-lf * PHOTO_WIDTH / wf);
            lf = 0;
        }
        if (rf > 640) {
            dx1 = Math.round((rf - 640) * PHOTO_HEIGHT / hf);
            rf = 640;
        }
        if (bf > 480) {
            dy1 = Math.round((bf - 480) * PHOTO_WIDTH / wf);
            bf = 480;
        }

        // TODO: keep temporary canvas alive and don't re-create every time.
        var canvas = document.createElement('canvas');
        canvas.width = PHOTO_WIDTH;
        canvas.height = PHOTO_HEIGHT;

        var cc = canvas.getContext('2d');
        cc.fillStyle = "white";
        cc.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

        cc.drawImage(video,
            lf, tf,
            Math.round(Math.abs(rf - lf)),
            Math.round(Math.abs(bf - tf)),
            dx, dy,
            PHOTO_WIDTH - dx - dx1,
            PHOTO_HEIGHT - dy - dy1);

        //'http://192.168.1.52:1234/templates?id='+ getUniqueId(),
        //'http://192.168.1.171:8082/templates?id='+ getUniqueId(),
        jQuery.ajax({
            url:            'http://192.168.1.67:1234/templates',
            type:           'POST',
            contentType:    'application/json',
            data:           makeRequestBody(getImageFromCanvasBase64(canvas)),
            timeout:        5000,

            success: function(reply) {
                if(reply) {
                    if(lunaScores[index] < reply.score) {
                        lunaScores[index] = reply.score;
                        ctrackScores[index] = score;

                        displayScore(index, score, reply.score);

                        var image = document.getElementById('photo' + index);
                        var context = image.getContext('2d');

                        // copy from temporary canvas to destination
                        context.drawImage(canvas, 0, 0);

                        // enable send button
                        $("#submit").removeClass('disabled');

                        slotBusy[index] = 0;
                    }
                }
            },

            error: function() {
                slotBusy[index] = 0;
            }
        });
    }

}

function drawLoop() {
    overlay_ = $('#overlay')[0];
    overlayCC_ = overlay_.getContext('2d');
    overlayCC_.clearRect(0, 0, 640, 480);
    video = $('#videoel')[0];
    requestAnimFrame(drawLoop);
    ctrack.draw(overlay_);

    if((++frame) % 12 !=0)
        return;

    bild += 1;

    if (bild > document.getElementById('ireset').value) {
        bild = 0;
        ctrack.reset2();
    }

    var face = ctrack.getCurrentPosition();

    if (face) {
        score = ctrack.getScore();

        document.getElementById('rate').innerHTML = score.toFixed(4);

        var minscore = document.getElementById('iscore').value;

        if (score > minscore) {
            bild = 0;

            var eyedist = Math.abs(face[32][0] - face[27][0]);

            // расстояние между глазами
            if (eyedist > 50) {
                document.getElementById('eye').innerHTML = (eyedist).toFixed(2);

                radnose = Math.atan(Math.abs(face[33][0] - face[62][0]) / Math.abs(face[33][1] - face[62][1]));

                // наклон головы
                if (radnose < document.getElementById('irad').value) {
                    document.getElementById('nase').innerHTML = (radnose).toFixed(2);

                    if(!shouldStopCapture())
                        makePortraitPhoto(face, score);
                } // нос
                else {
                    document.getElementById('nase').innerHTML = " ---Голову ровнее--- ";
                }
            } //	глаза
            else {
                document.getElementById('eye').innerHTML = " ---Поближе к камере--- ";
            }
        }
    }
}

function clearGallery() {
    for(var i = 0; i < ctrackScores.length; i++) {
        ctrackScores[i] = 0;
        lunaScores[i] = 0;
        slotBusy[i] = 0;

        bild = 0;

        var image = document.getElementById('photo' + i);
        var context = image.getContext('2d');

        context.clearRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);

        displayScore(i, 0, 0);

        // disabe send button
        $("#submit").addClass('disabled');
    }
}

function submitGallery() {
    if(!$("#submit").hasClass('disabled')) {

        var request = new Object();
        request.list = $('#inputList').val().toLowerCase();
        request.name = $('#inputName').val();
        request.data = [];

        for(var i = 0; i < lunaScores.length; i++) {
            if(isGoodPhoto(i)) {
                var image = document.getElementById('photo' + i);
                request.data.push(getImageFromCanvasBase64(image))
            }
        }

        if(request.data.length == 0)
            alert("request.data.length == 0!");

        jQuery.ajax({
            url:            '/persons', //'http://192.168.1.67:5001/',
            type:           'POST',
            contentType:    'application/json',
            data:           JSON.stringify(request),
            timeout:        10000,

            success: function(reply) {
                $('#error-failed-to-submit').fadeOut();
                alert("Success");
            },

            error: function() {
                $('#error-failed-to-submit').fadeIn();
            }
        });
    }
}
