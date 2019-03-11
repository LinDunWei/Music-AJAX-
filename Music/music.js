//封装一个兼容ie的ajax函数
// function ajax(method,url,data,callback,flag){
//     var xhr = null;
//     if(window.XMLHttpRequest){
//         xhr = new XMLHttpRequest();
//     }else{
//         xhr = new ActiveXObject('Microsoft.XMLHttp');
//     }
//     var param = "?";
//     for(var key in data){
//         if(data.hasOwnProperty(key)){
//             param += key + '=' + data[key] + '&';
//         }
//     }
//     param = param.slice(0,param.length - 1);
//     if(method == "GET"){
//         xhr.open(method,url + param + data,flag);
//         xhr.send();
//     }else if(method == "post"){
//         xhr.open(method,url,flag);
//         xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
//         xhr.send(data);
//     }
//     xhr.onreadystatechange = function(){
//         if(xhr.status == 200 && xhr.readyState == 4){
//             callback(JSON.parse(xhr.response));
//         }
//     }
// }

//0.全局变量
var player = document.getElementById("audio");
var searchList = document.getElementsByClassName("search-list")[0];
var searchBtn = document.getElementById('searchBtn');
var keywordInput = document.getElementById('keyword');
var lrcWrap = document.getElementById('lrc-wrap');
//初始化
var resetLrc = function(){
    index = 0;
    marginTop = 235;
}
//1.封装一个兼容ie的请求方式为get的ajax函数
function getAjax(url, data, callback) {
    var xhr = null;
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    } else {
        xhr = new ActiveXObject('Microsoft.XMLHttp');
    }
    var param = "?";
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            param += key + '=' + data[key] + '&';
        }
    }
    param = param.slice(0, param.length - 1);
    xhr.open('get', url + param, true);
    xhr.send();
    xhr.onreadystatechange = function () {
        if (xhr.status == 200 && xhr.readyState == 4) {
            callback(JSON.parse(xhr.response));
        }
    }
}
//2.封装搜索
var search = function (keywords, callback) {
    getAjax('http://localhost:3000/search', { keywords: keywords }, function (res) {
        if (callback) {
            callback(res.result.songs);
        }
    }, true);
}
//3.封装获取音乐url函数
var getSongsUrl = function (id, callback) {
    getAjax('http://localhost:3000/song/url', { id: id }, function (res) {
        if (callback) {
            callback(res.data[0].url);
        }
    });
}
//4.封装获取歌词函数
var getLrc = function (id, callback) {
    getAjax('http://localhost:3000/lyric', { id: id }, function (res) {
        //console.log(res);
        var lrcString = res.lrc.lyric;
        //console.log(lrcString);
        if (callback) {
            callback(lrcString);
        }
    });
}


//5.解析歌词
var paeseLrc = function (lrcString) {
    //将字符串时间转换为数字类型
    var parseTime = function (timeString) {
        // console.log(timeString);
        //[01:57.73] 以冒号为界切割分钟
        var timeStringArr = timeString.split(':');
        //例： 01 -> 1
        var min = parseInt(timeStringArr[0]);

        var s = parseFloat(timeStringArr[1]); //57.73
        //算出总毫秒数
        var totalTime = (min * 60 + s) * 1000;
        //处理一下JS计算精确值问题
        return parseInt(totalTime);
    }

    var lrcArr = [];
    // [03:03.640]无论是 后来故事 怎么了
    // [03:10.320]也要让 后来人生 精彩着
    // [03:16.850]后来的我们 我期待着
    //每句歌词最后一个字后面都有一个看不见的换行符，整首歌歌词lrcString利用\n符进行拆分
    var lrcStringArr = lrcString.split('\n');
    //每句歌词再进行拆分，分为时间和歌词
    //利用歌曲时间与歌词之间的‘ ] ’ 进行拆解，再切割第一个 ‘ [ ’ 符号得到时间
    for (var i = 0; i < lrcStringArr.length; i++) {
        var linse = lrcStringArr[i].split(']');
        var time = parseTime(linse[0].slice(1, linse[0].length));
        var content = linse[1];
        // console.log(time,content);
        if (content == undefined || isNaN(time)) continue //错误判断：如果最后一项没有，则跳过
        lrcArr.push(
            {
                //原先是 time: paeseTime(time)
                //引发的错误：time还没解析就被上面的错误判断语句终止了
                //解决方法：提前解析再赋值给time，然后继续if语句的错误判断
                time: time, //调用解析时间函数
                content: content
            }
        );
    }
    // console.log(lrcArr);
    return lrcArr;
}

//5.1 填充歌词
var fillLrc = function (lrcobjArr) {
    var tpl = '<li class="lrc-item">{%content%}</li>';
    var html = '';
    for (var i = 0; i < lrcobjArr.length; i++) {
        html += tpl.replace('{%content%}', lrcobjArr[i].content);
    }
    lrcWrap.innerHTML = html;
    nowLrcObjeArr = lrcobjArr;
}
//5.2 歌词滚动
var index = 0;
var marginTop = 235;
var nowLrcObjeArr = []; //全部歌词
var compareLrc = function(){
    //获取全部歌词
    var lrcItem = document.getElementsByClassName('lrc-item');
    //对比时间，确定哪一句歌词播放
    //原理：每句歌词对应的time与当前播放时间做差值，小于时间间隔100毫秒渲染歌词样式
    //发生的错误：时间单位要统一，当前播放时间单位为秒，需*1000进行毫秒转换
    if(nowLrcObjeArr[index].time-player.currentTime * 1000 < 100){
        lrcItem[index].style.opacity = "1";
        lrcItem[index].style.fontSize = "20px";
        lrcItem[index].style.color = "red";
        marginTop -= 30;
        lrcWrap.style.marginTop = marginTop + 'px';
        if(index-1 > -1){
            lrcItem[index-1].style.opacity = "0.5";
            lrcItem[index-1].style.fontSize = "";
            lrcItem[index-1].style.color = "";
        }
        index++;
    }

}
player.addEventListener('timeupdate',function(){
    compareLrc();
});


//6.获取搜索结果渲染列表
var readerSearchList = function (key) {
    var resultList = document.getElementById('reault-list');
    search(key, function (res) {
        // console.log(res);
        var tamplate = '<li class="songs" data-id="{%id%}"><h3>{%name%}</h3><h6><span>{%author%}</span>专辑：<span>{%zuanji%}</span></h6><hr></li>';
        var html = '';
        for (var i = 0; i < res.length; i++) {
            html += tamplate.replace('{%name%}', res[i].name)
                .replace('{%author%}', res[i].artists[0].name)
                .replace('{%zuanji%}', res[i].album.name)
                .replace('{%id%}', res[i].id)
        }
        resultList.innerHTML = html;
        openSearchList();
        addEventListener();
    })
}
//7.点击搜索列表下拉展示
searchBtn.addEventListener('click', function () {
    var value = keywordInput.value;
    readerSearchList(value);

});
//8.关闭/打开搜索列表
var closeSearchList = function () {
    searchList.className = 'search-list';
    lrcWrap.style.display = "block";
}
var openSearchList = function () {
    searchList.className = 'search-list active';
    lrcWrap.style.display = "none";
}

//9.下拉列表点击播放音乐事件
var addEventListener = function () {
    var songs = document.getElementsByClassName('songs');
    for (var i = 0; i < songs.length; i++) {
        songs[i].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            // getSongsUrl(id, function (url) {
            //     initPlayer(url);
            //     closeSearchList();
            // });
            play(id);
            closeSearchList();
        });
    }
}
//10.封装播放函数
var initPlayer = function(url){
    player.src = url;
}

//测试代码
// search('123我爱你', function (e) {
//     // console.log(e[0].id);
//     var SongsId = e[0].id;
//     getSongsUrl(SongsId, function (e) {
//         // console.log(e);
//         var url = e;
//         document.getElementById("audio").src = url;
//     })
//     getLrc(SongsId, function (e) {
//         var lrc = paeseLrc(e);
//         console.log(lrc);
//         fillLrc(lrc);
//     })
// })

//究极大封装
var play = function(id){
    resetLrc(); //初始化
    //获取音乐播放链接，开始播放
    getSongsUrl(id,function(e){
        initPlayer(e);
        player.play();
    })
    //获取歌词，解析后填充
    getLrc(id,function(e){
        fillLrc(paeseLrc(e));
    })
}