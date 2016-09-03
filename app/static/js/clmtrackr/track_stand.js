"use strict";
  /* Данная функция создаёт кроссбраузерный объект XMLHTTP */
 // function getXmlHttp() {
 //   var xmlhttp;
 //   try {
 //     xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
 //   } catch (e) {
 //   try {
 //     xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
 //   } catch (E) {
 //     xmlhttp = false;
 //   }
 //   }
 //   if (!xmlhttp && typeof XMLHttpRequest!='undefined') {
 //     xmlhttp = new XMLHttpRequest();
 //   }
 //   return xmlhttp;
 // }


//Константы действия

var const_doNothing = 0;                        //<- пока ничего не делаем


var currentSystemStatus =
{
    humanInFrame : false,
    idInVisitors : 0,                           //<- id в списке визитёров
    similarityVisitorFound : false,             //<- был ли поиск в списке визитёров
    similarityStarFound: false,                 //<- был ли поиск в списке знаменитостей
    idInLuna : 0,                               //<- текущий id
    userscore: 0,                               //<- похожесть на визитёра
    nextAction : const_doNothing,               //<- определяет какое действие делаем следющим
    tempIdInLuna : 0,
    timer : false                               //<- таймер
};

var currentLunaStatus =                         //<- статус ждём ли мы  ответов от луныили нет
{
    busy : false,
    pause : 0
};

var score = 0;                                  //<- скоре, который выдал стенд

var frameBuffer="";                             //<- буфер для кадра, который сейчас обрабатывается

var minscore =  document.getElementById('iscore').value;     //<- минимальный score для визитёров
var bild = 0;
var overlayCC_;
var overlay_;


/* Цикл обработки  кадров.
 * В этом цикле  происходит две вещи:
 * 1. Отрисовка рожи
 * 2. Отправление  кадров на анализ. Кадр не отправляется, пока предыдущий отправленный не обработался.
 * За это отвечает  флаг currentLunaStatus.busy
 */
function drawLoop() {
    var overlay2 = document.getElementById('fotosend');
	var overlayCC2 = overlay2.getContext('2d');
    overlay_ = $('#overlay')[0];
    overlayCC_ = overlay_.getContext('2d');
    overlayCC_.clearRect(0, 0, 640, 480);
    requestAnimFrame(drawLoop);
    minscore =  document.getElementById('iscore').value;
    ctrack.draw(overlay_);


    bild += 1;
    if ( bild >  $('#ireset').value)
    {
       bild = 0;
      ctrack.reset2();
    }

    if ( currentLunaStatus.busy == false)
    {
        if ( currentSystemStatus.idInLuna == 0) {
            currentSystemStatus.nextAction = const_doNothing;
        }
    }

    var face = ctrack.getCurrentPosition();

    if ( face ) {

        currentSystemStatus.timer = false;
        score = ctrack.getScore();
        document.getElementById('rate').innerHTML =  "Capturing " + score.toFixed(4);
        document.getElementById('message').innerHTML =  "Capturing " + score.toFixed(4);

        if (score > minscore) {
            bild = 0;
          // расстояние между глазами
            if ( Math.abs(face[32][0]- face[27][0]) > 50 ) {
                document.getElementById('eye').innerHTML =  Math.round(Math.abs(face[32][0]- face[27][0])).toFixed(2) ;
                // наклон головы меньше 10 градусов
                var radnose = Math.atan(Math.abs(face[33][0]- face[62][0])/Math.abs(face[33][1]- face[62][1]));
                if ( radnose  < document.getElementById('irad').value)
                {
                    // кто-то пришел
                    document.getElementById('nase').innerHTML =  Math.atan(Math.abs(face[33][0] - face[62][0])/Math.abs(face[33][1]- face[62][1])).toFixed(2) ;
                    var widthfoto = 240;
                    var heightfoto = 320;
                    // ширина
                    var wf = Math.abs(face[32][0]- face[27][0])*4;
                    // высота
                    var hf = wf / 0.75;
                    if ( (wf < 320) && (hf < 240) ) {
                        document.getElementById('eye').innerHTML =  " ---Ближе к камере--- ";
                    }
                    else {
                        var dy= 0;
                        var lf = Math.round(2.5*face[27][0] - 1.5*face[32][0]);
                        var dx= 0;
                        var dx1 = 0;
                        var dy1 = 0;
                        var rf = lf + wf;
                        var tf = Math.round(face[32][1] - hf*0.4);
                        var bf = tf + hf;
                        if ( tf < 0) {
                            dy = Math.round(-tf*heightfoto/hf );
                            tf = 0;
                        }
                        if ( lf < 0) {
                            dx = Math.round(-lf*widthfoto/wf);
                            lf= 0;
                        }
                        if ( rf > 640) {
                            dx1 = Math.round( (rf-640)* heightfoto/hf);
                            rf = 640;
                        }
                        if ( bf > 480) {
                            dy1= Math.round( (bf-480)*widthfoto/wf);
                            bf= 480;
                        }
                        overlayCC2.clearRect(0,0,240,320);
                        overlayCC2.drawImage(vid, lf, tf, Math.round(Math.abs( rf-lf)), Math.round(Math.abs(bf-tf)), dx, dy, widthfoto-dx-dx1, heightfoto-dy-dy1 );
                        overlayCC2.strokeStyle = "green";
                        ctrack.searching= 0;
                        currentSystemStatus.timer = false;  // человек в кадре, таймер стоп
                        currentLunaStatus.pause= 0;
                        // отправлеям фото
                        sendFoto();
                        ctrack.reset2();
                        //}
                    }  // end of 320x240
                } // нос
                else {
                    incPause();
                    document.getElementById('nase').innerHTML =  " ---Голову ровнее--- ";
                    document.getElementById('message').innerHTML =  "---Голову ровнее---";
                }
            } //    глаза
            else {
                incPause();
                document.getElementById('eye').innerHTML =  " ---Поближе к камере--- ";
                document.getElementById('message').innerHTML =  "---Поближе к камере---";
            }
        }  // 0.65
        else {
            document.getElementById('rate').innerHTML =  "Нет захвата " + score.toFixed(2) + " минимум "+ document.getElementById('iscore').value;
            //document.getElementById('message').innerHTML =  "---/*\---";
            incPause();
        }
    }
    else
    {
        currentSystemStatus.timer= true;
        incPause();
        currentSystemStatus.userscore = 0;
    }
    //sendLuna();
    showAllAnimation();
}


// Очистка рамочек с фотографиями
function clearFoto( mode) {

    for(var i = 1; i < 4; i++)
    {
        var i2 = i + mode;
        var overlay3 = document.getElementById('foto'+i2);
        var overlayCC3 = overlay3.getContext('2d');
        //overlayCC3 .fillStyle = "#5A9BDC";
        overlayCC3 .fillStyle = "#ffffff";
        overlayCC3.fillRect(0, 0, 240, 320);
        document.getElementById("foto"+i2+"r").innerHTML= "";
        if ( i2 > 3)
        {
          document.getElementById("foto"+i2+"n").innerHTML= "";
        }
        else
        {
            document.getElementById('you').innerHTML= "This is you:";
        }
    }
}

/*
* Отрисовка  изображения в рамочках
*/
function showAnswer(num, id, pid, score) {

    var example = document.getElementById("foto"+ num),
    ctx       = example.getContext('2d'), // Контекст
    pic       = new Image();              // "Создаём" изображение

    if(pid >= 0)
        pic.src    = "/photos_luna/"+id+"/"+pid;
    else
        pic.src    = "/photos_luna/"+id;


    console.log( pic.src);
    pic.onload = function() {    // Событие onLoad, ждём момента пока загрузится изображение
//       ctx.drawImage(pic, 0, 0);  // Рисуем изображение от точки с координатами 0, 0
         var kw = pic.width/240;
         var kh = pic.height/320;
         var k=0;
         if ( kw > kh)
             k= kw;
         else
             k= kh;
        ctx.drawImage(pic, -1, -1, pic.width/k+2, pic.height/k+2 );
        //ctx.drawImage(pic, 0, 0, 240, 320);

    };
    //ctx.fillStyle = "#5A9BDC";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 240, 320);

    if ( num > 3)
        document.getElementById('foto'+num+'r').innerHTML= score.toFixed(0)+ "%";
    else
        document.getElementById('foto'+num+'r').innerHTML= "";
}
// stars visitors
/* ПОлучение по id занесённой фотки в луне списка похожих визитёров
 *  Если   в итоге не нашлось  похожего, больше чем на 0.9, значит похожих нет
 */
function getListVisitors( id) {

    currentLunaStatus.busy = true;

    var url = "http://192.168.1.67:1234/similar_templates?id="+ id + "&candidates_list=visitors";
    console.log (url);

    jQuery.ajax({
        url:            url,
        type:           'GET',
        contentType:    'application/json',
        data:           "",
        timeout:        10000,
        success: function(reply) {
            if ( reply.matches[0].similarity > 0.9)
            {
                document.getElementById('lbusy').innerHTML= "Visitors OK";
                var startid = reply.matches[0].id;
                if ( currentSystemStatus.userscore == 0)
                    currentSystemStatus.userscore = (reply.matches[0].similarity*100).toFixed(0);
                document.getElementById('you').innerHTML= "This is you, matching is "+ currentSystemStatus.userscore + "%";
                showAnswer( 1, startid, 0, reply.matches[0].similarity);
                showAnswer( 2, startid, 1);
                showAnswer( 3, startid, 2);
                console.error("Меняем__лицо =" + currentSystemStatus.idInLuna);
                currentSystemStatus.similarityVisitorFound = true;
            }
            else
            {
                // не найден
                document.getElementById('you').innerHTML= "Have not been founded ";
            }
            currentSystemStatus.nextAction = const_doNothing;
            currentLunaStatus.busy= false;
        },
        error: function() {
            currentLunaStatus.busy = false;
        }
    });
}

/* ПОлучение имени похожей  звезды из базы
 * num --- порядковый номер фотографии на странице
 * id --- id звезды
 */

function getStarName( id, num) {

    var url = "/photos_luna/"+ id+"/name/";
    console.log(url);

    jQuery.ajax({
        url:            url,
        type:           'GET',
        contentType:    'application/json',
        data:           "",
        timeout:        10000,
        success: function(reply) {
            if ( num == 4)
            {
                if ( reply == "")
                    document.getElementById('foto4n').innerHTML= "id:"+ id+ "";
                else
                    document.getElementById('foto4n').innerHTML= reply;
            }
            if ( num== 5 )
            {
                if ( reply == "")
                    document.getElementById('foto5n').innerHTML= "id:"+ id+ "";
                else
                    document.getElementById('foto5n').innerHTML= reply;
            }
            if ( num == 6)
                if ( reply == "")
                    document.getElementById('foto6n').innerHTML= "id:"+ id+ "";
                else
                    document.getElementById('foto6n').innerHTML= reply;
            console.log( reply);
        },
        error: function() {
            currentLunaStatus.busy = false;
        }
    });
}

/* Получение списка похожих звёзд из базы
 * Сразу  же происходит отрисовка  на сайте.
 * id ---  id  в луне, тот, на кого ищем похожих
 * Вфзфваем поиск по визитёрам.
 */
function getListStars( id) {

    var url = "http://192.168.1.67:1234/similar_templates?id="+ id +"&candidates_list=stars";
    console.log(url);

    document.getElementById('lbusy').innerHTML= "Stars";
    jQuery.ajax({
        url:            url,
        type:           'GET',
        contentType:    'application/json',
        data:           "",
        timeout:        10000,
        success: function(reply) {
            currentSystemStatus.similarityStarFound = true;
            if ( reply.matches[0].similarity > 0.05) {
                var starid4 = -1;
                var starid5 = -1;
                var starid6 = -1;
                clearFoto(3);
                if(reply.matches.length > 0) {
                    starid4 = reply.matches[0].id;
                    showAnswer( 4, starid4, -1, Math.round(reply.matches[0].similarity*100));
                    getStarName( starid4, 4);
                }
                if(reply.matches.length > 1) {
                    starid5 = reply.matches[1].id;
                    showAnswer( 5, starid5, -1, Math.round(reply.matches[1].similarity*100) );
                    getStarName( starid5, 5);
                }
                if(reply.matches.length > 2) {
                    starid6 = reply.matches[2].id;
                    showAnswer( 6, starid6, -1, Math.round(reply.matches[2].similarity*100)) ;
                    getStarName( starid6, 6);
                }
                getListVisitors(id);
            }
        },
        error: function() {
            currentLunaStatus.busy = false;
        }
    });
}
/* Отправка фото в  луну, мы кладём фото с временным флагом!
 * data ---  фото в base64
 */
function sendSinglePhoto(data) {
    var body = "{ \"image\": \""+ data +"\" }";
    var url = "http://192.168.1.67:1234/templates?temporary=1";
    console.log(url);
 //Send the proper header information along with the request
    //document.getElementById('message').innerHTML= "Отправляем на луну";
    jQuery.ajax(
        {
            url:            url,
            type:           'POST',
            contentType:    'application/json',
            data:           body,
            timeout:        10000,

            success: function(reply) {
                 try {
                    document.getElementById('fotoid').innerHTML= reply.id;
                   // получили ИД лица в базе
                    currentSystemStatus.tempIdInLuna = reply.id;
                    document.getElementById('message').innerHTML= "Лицо обнаружено";
                    //currentLunaStatus.busy = false;
                    checkLastFace();
                }
                catch (E) {
                    currentSystemStatus.nextAction = const_doNothing;
                    currentLunaStatus.busy = false;
                }
            },

            error: function(reply) {
                console.log(reply);
                currentSystemStatus.nextAction = const_doNothing;
                currentLunaStatus.busy = false;
            }
        });
}

function getImageJSON(name) {
    return document.getElementById(name).toDataURL('image/jpeg').replace(/data:image\/jpeg;base64,/, '')
}

function sendFoto() {
    if ( currentLunaStatus.busy == false)
    {
        currentLunaStatus.busy = true;
        document.getElementById('lbusy').innerHTML= "PUT ID";
        console.log("Шлем фото");
        frameBuffer = getImageJSON("fotosend");
        sendSinglePhoto(frameBuffer);
    }
    else
    {
        console.log("Канал до луны занят");
    }
}

//ПОлучаем настройки
/*function resetLuna() {
    $('#lbusy').innerHTML= "Free";
    minscore = $('#iscore').value;
    $('#you').innerHTML= "This is you:";
}

function fullresetLuna() {
    resetLuna();
}*/


/* В кадре никого нет.
 */
function incPause()
{
    ctrack.searching= 1;
    if ( currentSystemStatus.similarityStarFound == false )
    {
        currentLunaStatus.pause = 0;
        document.getElementById('pb').style.display = "none";
        document.getElementById('message').innerHTML = "Ready-to-go";
        return;
    }
    if ( currentSystemStatus.timer == false)
    {
        currentLunaStatus.pause = 0;
        document.getElementById('pb').style.display = "none";
        document.getElementById('message').innerHTML = "Ready-to-go";
        return;
    }
    document.getElementById('pb').style.display = "block";
    document.getElementById('pb').value = 120 - currentLunaStatus.pause;
    document.getElementById('message').innerHTML = "Refreshing after "+
                                                    Math.round((120-currentLunaStatus.pause)/10, 0) +" seconds";
    currentLunaStatus.pause += 1;
    document.getElementById('lpause').innerHTML = currentLunaStatus.pause;
    if ( currentLunaStatus.pause > 120)
    {
        currentLunaStatus.pause = 0;
        clearFoto(0);
        clearFoto(3);
        currentSystemStatus.similarityVisitorFound = false;
        currentSystemStatus.similarityStarFound = false;
        currentSystemStatus.idInLuna = 0;
        console.error("Обнуляем лицо =" + currentSystemStatus.idInLuna);
        currentSystemStatus.idInLuna = 0;
    }
}


function showAllAnimation () {
//    if (animestop == 1) {
//        var obj = document.getElementById('fotostar');
//        obj.style.display = "block";
//        obj = document.getElementById('gifcontainer1');
//        obj.style.display = "none";
//        obj = document.getElementById('gifcontainer2');
//        obj.style.display = "none";
//        obj = document.getElementById('gifcontainer3');
//        obj.style.display = "none";
//   }
//    else {
//        var obj = document.getElementById('fotostar');
//        obj.style.display = "none";
//        obj = document.getElementById('gifcontainer1');
//        obj.style.display = "block";
//        obj = document.getElementById('gifcontainer2');
//        obj.style.display = "block";
//        obj = document.getElementById('gifcontainer3');
//        obj.style.display = "block";
//    }
//   return;
//   var p = Math.floor(Math.random() * 100);
//    if (p > 20)
//        return;
//   var ind = Math.floor(Math.random() * 294);
//    var ind2 = Math.floor(Math.random() * 294);
//    var ind3 = Math.floor(Math.random() * 294);
//    //if( ind < 147)
//    //{
//    showAnimation(4, anime1);
//    showAnimation(5, anime2);
//    showAnimation(6, anime3);
//    anime1++;
//    anime2++;
//    anime3++;
//   if (anime1 > 94)
//        anime1 = 1;
//    if (anime2 > 190)
//        anime2 = 95;
//    if (anime3 > 294)
//        anime3 = 185;
}

//function showAnimation ( num, id) {
//
//     //return;
//     if ( animestop == 1)
//         return;
//
// //    var ind= Math.floor(Math.random() * 90);
// //    if ( ind > 23)
// //        return;
//
//     var example = document.getElementById("foto"+num),
//     ctx       = example.getContext('2d'), // ��������
//     pic       = new Image();              // "�������" �����������
//
//     pic.src    = 'data/'+ animef[ id];
//     console.log ( pic.src);
//
//     pic.onload = function() {    // ������� onLoad, ���� ������� ���� ���������� �����������
//         var kw = pic.width/240;
//         var kh = pic.height/320;
//         var k=0;
//         if ( kw > kh)
//             k= kw;
//         else
//             k= kh;
//         ctx.drawImage(pic, 0, 0, pic.width/k, pic.height/k );
//         //animei++;
//        // if ( animei > 19) animei=0;
//     }
//}

/* Кладём фото  на постоянную основу в базу
 * Вызываем, когда в кадре изменился человек (включая когда, не было до этого человека)
 */
function putPermanentImageInLuna()
{
    var body = "{ \"image\": \""+ frameBuffer +"\" }";
    var url = "http://192.168.1.67:1234/templates";

    jQuery.ajax({
        url:            url,
        type:           'POST',
        contentType:    'application/json',
        data:           body,
        timeout:        10000,
        success: function(reply)
        {
            try
            {
                document.getElementById('fotoid').innerHTML= reply.id;
                // получили ИД лица в базе
                currentSystemStatus.idInLuna = reply.id;
                document.getElementById('message').innerHTML= "Лицо обнаружено";
                currentLunaStatus.busy = false;
                if ( currentSystemStatus.similarityStarFound == false)
                {// нет результатов по звездам
                    getListStars(currentSystemStatus.idInLuna );
                }
                else {
                    if (currentSystemStatus.similarityVisitorFound == true) {
                        currentSystemStatus.nextAction = const_doNothing;
                        currentLunaStatus.busy = false;
                    }
                    else {
                        getListVisitors(currentSystemStatus.idInLuna);
                    }
                }
            }
            catch (E)
            {
                currentSystemStatus.nextAction = const_doNothing;
                currentLunaStatus.busy = false;
            }
        },
        error: function(reply) {
            console.log(reply);
            currentSystemStatus.nextAction = const_doNothing;
            currentLunaStatus.busy = false;
        }
    });
    console.log("Put ok");
}


/*  Сверка новой фотки человека с той. что до этого была.
 * Если оказались похожи  меньше, чем на 0.9, значит разные
 * Если появился новый человек, кладём его фото на постоянную  в базу.
 * после этого запускаем поиск по базе знаменитостей и визитёров, если до этого не искали в них
 */
function checkLastFace() {

    //currentLunaStatus.busy = true;
    console.log("Прошлое лицо "+  currentSystemStatus.idInLuna);
//    document.getElementById('message').innerHTML= "Проверка на повтор";

    if ( currentSystemStatus.idInLuna == 0)
    {
        clearFoto( 0);
        clearFoto( 3);
        currentSystemStatus.similarityStarFound = false;
        currentSystemStatus.similarityVisitorFound = false;
        putPermanentImageInLuna();
        console.error("Прошлое лицо стало "+  currentSystemStatus.idInLuna);
        return;
    }

    var url = "http://192.168.1.67:1234/similar_templates?id="+ currentSystemStatus.tempIdInLuna + "&candidates="+ currentSystemStatus.idInLuna +  "&temporary=1" ;
    console.log (url);

    jQuery.ajax({
        url:            url,
        type:           'GET',
        contentType:    'application/json',
        data:           "",
        timeout:        10000,
        success: function(reply) {
            if (reply.matches[0].similarity < 0.9)
            {
                // новый, очистить все результаты
                //document.getElementById('message').innerHTML= "Новое лицо";
                putPermanentImageInLuna();
                console.error("Новое лицо =" + currentSystemStatus.idInLuna);
                clearFoto( 0);
                clearFoto( 3);
                currentSystemStatus.similarityStarFound = false;
                currentSystemStatus.similarityVisitorFound = false;
            }
            else
            {
                //document.getElementById('message').innerHTML= "Старое лицо";
                console.error("Старая фотка =" + currentSystemStatus.idInLuna);
                //currentLunaStatus.busy = false;
                if ( currentSystemStatus.similarityStarFound == false)
                {// нет результатов по звездам
                    getListStars(currentSystemStatus.idInLuna );
                }
                else {
                    if (currentSystemStatus.similarityVisitorFound == true) {
                        currentSystemStatus.nextAction = const_doNothing;
                        currentLunaStatus.busy = false;
                    }
                    else {
                        getListVisitors(currentSystemStatus.idInLuna);
                    }
                }
            }
        },
        error: function() {
            currentLunaStatus.busy = false;
        }
    });
}


