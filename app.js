var express = require('express'),
    bodyParser = require('body-parser'),
    oauthserver = require('node-oauth2-server');
var mysql = require('mysql');

//db와 연결
var client = mysql.createConnection({
	//host : '52.78.118.118',
	user : 'root',
	password : '6801',
	database : 'kwang',
	//port : '3000'
});

client.connect();

var app = express();

app.use(bodyParser()); // REQUIRED
//app.use(bodyParser.json());

var memorystore = require('model.js');

app.oauth = oauthserver({
  model: memorystore,
  grants: ['password','refresh_token'],
  debug: true
});

app.all('/oauth/token', app.oauth.grant());

app.get('/', app.oauth.authorise(), function (req, res) {
  res.send('Secret area');
});

//app.get('/sarea/lists', function(req, res){

//});

app.use(app.oauth.errorHandler());

//sa_info1.xlsx 파일 파싱
var XLSX = require('xlsx');
var workbook = XLSX.readFile('../sa_info1.xlsx');
var sheet_name_list = workbook.SheetNames;
sheet_name_list.forEach(function(y) {
    var worksheet = workbook.Sheets[y];
    var headers = {};
    var data = [];
    for(z in worksheet) {
        if(z[0] === '!') continue;
        //parse out the column, row, and value
        var tt = 0;
        for (var i = 0; i < z.length; i++) {
            if (!isNaN(z[i])) {
                tt = i;
                break;
            }
        };
        var col = z.substring(0,tt);
        var row = parseInt(z.substring(tt));
        var value = worksheet[z].v;

        //store header names
        if(row == 1 && value) {
            headers[col] = value;
            continue;
        }

        if(!data[row]) data[row]={};
        data[row][headers[col]] = value;
    }
    //drop those first two rows which are empty
    data.shift();
    data.shift();
    //console.log(data.length);
    //console.log(data[153].unitName);
    /* 
    var len = data.length;

    for (var i = 0; i < len; i++) {
        client.query('insert into sa_info (unitCode, unitName, routeName, routeNo, xValue, yValue, phone, convenience, brand, maintenanceYn, truckSaYn, batchMenu, gasolinePrice, lpgPrice, way, address, region, sarea_pic) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [data[i].unitCode, data[i].unitName, data[i].routeName, data[i].routeNo, data[i].xValue, data[i].yValue, data[i].phone, data[i].convenience, data[i].brand, data[i].maintenanceYn, data[i].truckSaYn, data[i].batchMenu, data[i].gasolinePrice, data[i].lpgPrice, data[i].way, data[i].address, data[i].region, data[i].sarea_pic], function (error, data) {
            if (!error)
                console.log("success_input");
            else
                console.log("error_input");
        }); 
    } */
});

//전역 선언?
var cux, cuy;
xx = [];
yy = [];
distance = [];

//전체 휴게소의 위도 경도 저장해둠
/*function saveXY() {
    client.query('select xValue, yValue from sa_info', function(error, data) {
//	console.log('ok');	
for(var i=0; i<150; i++)
        {
            xx[i] = data[i].xValue;
	    yy[i] = data[i].yValue;
//console.log(x[i]);
        }
console.log(xx[0]);
    });
}*/

//현재 위치와 휴게소 사이의 거리 계산해서 줌
app.post('/current_position', function (req, res) {
    //현재 자동차 위치 얻어옴
    cux = req.body.x;
    cuy = req.body.y;

    console.log('////////////////////////////////////current x, y : ' + cux + ' , ' + cuy);
});

//휴게소마다 나와의 거리 계산
app.get('/sarea/distance', function (req, res) {
    //전체 휴게소 위도 경도 저장
       client.query('SELECT s2.unitCode, unitName, xValue, yValue, (select round(avg(total_score), 2) from sa_con_review s1 where s1.unitCode = s2.unitCode group by s1.unitCode) as avg_total_score FROM sa_info s2 order by avg_total_score', function(error, data) {
        for(var i=0; i<150; i++)
            {
                xx[i] = data[i].xValue;
                yy[i] = data[i].yValue;
            }
        });
    
        //클라이언트로 거리값 구해서 보내기
        for(var i=0; i<150; i++)
        {
            distance[i] = calculateDistance(cux, cuy, yy[i], xx[i]);
        }
        res.send(distance); 
        console.log(distance[0]);
});

//전체 휴게소 리스트 반환 api
app.get('/sarea/lists', function (req, res) {
//    console.log(cux + ' , ' + cuy);

    // 휴게소 기본 정보
    //avg_total_score : unitCode별 전체 평점
    client.query('SELECT s2.unitCode, unitName, xValue, yValue, address, sarea_pic, (select round(avg(total_score), 2) from sa_con_review s1 where s1.unitCode = s2.unitCode group by s1.unitCode) as avg_total_score FROM sa_info s2 order by avg_total_score desc', function (error, data) {
        res.send(data);
	console.log(data);
        //console.log(calculateDistance(37.569797, 126.983733, 36.871927, 127.541908));
    });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return Math.round(d);
}
Number.prototype.toRad = function () {
    return this * Math.PI / 180;
}

 
////////////////////휴게소 상세 정보 반환 api

//소개 정보
app.get('/sarea/detail/info/:unitCode', function (req, res) {
    var unitCode = req.param('unitCode');
//    console.log(unitCode);

    var query = 'select s2.unitCode, unitName, phone, convenience, gasolinePrice, lpgPrice, batchMenu, address, sarea_pic';
    query += ' ,(select round(avg(total_score), 2) from sa_con_review where unitCode = "' + unitCode + '" group by unitCode) as avg_total_score';
    query += ' from sa_info s2 where unitCode = "' + unitCode + '"';

    client.query(query, function (error, data) {
        res.send(data);
	console.log(data);
    });
});

//시설 평가 : 푸드코트/주차시설/주유소/화장실/정비센터/와이파이 평점 -> 평균, 평가한 사람 수 
app.get('/sarea/detail/con/:unitCode', function (req, res) {
    var unitCode = req.param('unitCode');

    var query = 'select round(avg(s_score), 2) as ss, round(avg(l_score), 2) as ls, round(avg(f_score), 2) as fs, round(avg(r_score), 2) as rs, round(avg(p_score), 2) as ps, round(avg(w_score), 2) as ws, count(*) as count from sa_con_review where unitCode = "' + unitCode + '" group by unitCode';
    
    client.query(query, function (error, data) {
        res.send(data);
	console.log(data);
    });
});

//전체 사용자 후기 : (유저 사진, 코멘트, 닉네임, 등록 날짜) 묶어서...
app.get('/sarea/detail/review/:unitCode', function (req, res) {
    var unitCode = req.param('unitCode');

    var query = 'select reviewCode, unitCode, s1.userid, nickname1, date1, comment1, tag1,tag2, tag3, (select user_pic from user_info s2 where s2.userid = s1.userid) as user_pic from sa_con_review s1 where unitCode = "' + unitCode + '"';

    client.query(query, function (error, data) {
        res.send(data);
	console.log(data);
    });
});

//먹거리 평가 : top 먹거리 5개 & 평점
app.get('/sarea/detail/food2/:unitCode', function (req, res) {
    var unitCode = req.param('unitCode');

    var query = 'select food_code, unitCode, food, round(score/count, 2) as food_score from sa_food_rank where unitCode = "' + unitCode + '" order by score desc limit 5';

    client.query(query, function (error, data) {
        res.send(data);
	console.log(data);
    });
});

var request = require('request');

//////////////////////////////////////////////////////////////////////////////////////////////////평점 입력 api

/*
1. /sarea/input/food_check -> 음식 평가
-> unitCode, userid, food, score

2. /sarea/input/con_check -> 시설 평가
-> unitCode, userid, total_score, s_score, l_score, f_score, r_score, p_score, w_score

3. /sarea/input/review -> 후기 쓰기
-> unitCode, userid, comment, nickname, date, tag1, tag2, tag3, stamp

4. /sarea/input/stamp -> 스탬프 찍으면
-> unitCode, userid, stamp
*/

var request = require('request');

app.post('/sarea/input/con_check', function (req, res) {
    //-> unitCode, userid, s_score, l_score, f_score, r_score, p_score, w_score

    var unitCode = req.body.unitCode; //휴게소 코드
    var userid = req.body.userid; //사용자 id

    var s_score = Number(req.body.s_score); //정비센터 -> sa_con_review
    var l_score = Number(req.body.l_score); //주유소 -> sa_con_review
    var f_score = Number(req.body.f_score); //푸드코트 -> sa_con_review
    var r_score = Number(req.body.r_score); //화장실 -> sa_con_review
    var p_score = Number(req.body.p_score); //주차시설 -> sa_con_review
    var w_score = Number(req.body.w_score); //와이파이 -> sa_con_review    

    var query = 'insert into sa_con_review (unitCode, s_score, l_score, f_score, r_score, p_score, w_score, userid) values(?,?,?,?,?,?,?,?)';

    // 데이터베이스 요청을 수행합니다.
    client.query(query, [
        unitCode, s_score, l_score, f_score, r_score, p_score, w_score, userid
    ], function (error, data) {
        res.send(data);
        console.log(data);
    });
});

app.post('/sarea/input/food_check', function (req, res) {
    //-> unitCode, userid, food, score
    var unitCode = req.body.unitCode; //휴게소 코드
    var userid = req.body.userid; //사용자 id

    var food = req.body.food; //추천 음식 -> sa_food_rank
    var score = Number(req.body.score); //음식 평점 -> sa_food_rank

    var http = require('http');
    var options = {
        host: 'ec2-52-78-118-118.ap-northeast-2.compute.amazonaws.com',
        port: 3000,
        path: '/sarea/realin/'+unitCode+'/'+encodeURIComponent(food),
        method: 'GET'
    };

    http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            if (chunk[1] == ']') //아무것도 안들었음. food_code가 없다.
            {
                console.log("no food_code");
                //insert
                // 데이터베이스 요청을 수행합니다.
                client.query('INSERT INTO sa_food_rank (unitCode, food, score, count) VALUES(?,?,?,?)', [
                    unitCode, food, score, 1
                ], function (error, data) {
                    //res.send(data);
                    console.log(data);
                });

            }
            else {
                var fc = (JSON.parse(chunk))[0].food_code;
                console.log('food_code : ' + fc);

                //if(fc > 0) //이미 db에 있는 음식
                {
                    console.log("yes food_code");
                    console.log("yes : " + unitCode + ', ' + food + ', ' + score);
                    //update
                    var query = 'update sa_food_rank set score = (select * from (select score from sa_food_rank s where unitCode = "';
                    query += unitCode + '" and food = "' + food + '") as s) + ' + score + ', ';
                    query += 'count = (select * from (select count from sa_food_rank ss where unitCode = "' + unitCode + '" and food = "' + food + '") as ss) + ' + 1;
                    query += ' where unitCode = "' + unitCode + '" and food = "' + food + '"';

                    // 데이터베이스 요청을 수행합니다.
                    client.query(query, function (error, data) {
                        //res.send(data);
			console.log(query);
                        console.log(data);
                    });
                }
            }
        });
    }).end();
});


app.post('/sarea/input/review', function (req, res) {
    //-> unitCode, userid, comment, nickname, date, tag1, tag2, tag3, stamp, total_score
    var unitCode = req.body.unitCode; //휴게소 코드
    var userid = req.body.userid; //사용자 id

    var total_score = Number(req.body.total_score); //휴게소 전체 평점  -> sa_con_review

    var tag1 = req.body.tag1; //태그1
    var tag2 = req.body.tag2; //태그2
    var tag3 = req.body.tag3; //태그3

    //var stamp = Number(req.body.stamp); //스탬프 찍었는지 유무(찍었으면 1, 아니면 0) -> 디폴트 0

    var comment = req.body.comment; //코멘트
    var date = req.body.date; //후기 등록 날짜

    var nickname1 = req.body.nickname; //닉네임 = 이름

    var query = 'update sa_con_review set ';

    query += 'tag1 = "' + tag1 + '", ';
    query += 'tag2 = "' + tag2 + '", ';
    query += 'tag3 = "' + tag3 + '", ';
    //query += 'stamp = ' + stamp + ', ';
    query += 'comment1 = "' + comment + '", ';
    query += 'date1 = "' + date + '", ';
    query += 'nickname1 = "' + nickname1 + '", ';
    query += 'total_score = ' + total_score + ' where userid = "' + userid + '"';

    // 데이터베이스 요청을 수행합니다.
    client.query(query, function (error, data) {
        res.send(data);
        console.log(data);
    });

});

app.post('/sarea/input/stamp', function (req, res) {
    //-> unitCode, userid, stamp
    var unitCode = req.body.unitCode; //휴게소 코드
    var userid = req.body.userid; //사용자 id

    var stamp = Number(req.body.stamp); //스탬프 찍었는지 유무(찍었으면 1, 아니면 0) -> 디폴트 0
    console.log("stamp : " + stamp + ", userid : " + userid + ", unitCode : " + unitCode);
    if (stamp == 1) //스탬프 찍음
    {
        request('http://ec2-52-78-118-118.ap-northeast-2.compute.amazonaws.com:3000/sarea/sa_info/stampin/' + userid, function (error, res, body) {
            if (!error && res.statusCode == 200) {
		console.log("body : " +(JSON.parse(body))[0].stamp_list);

                if ((JSON.parse(body))[0].stamp_list == "") //디비에 아직 아무 스탬프도 없음
                {
		    console.log("no stamp");
                    //그냥 update
                    var query = 'update user_info set stamp_count = 1, stamp_list = "' + unitCode + '" where userid = "' + userid + '"';

                    client.query(query, function (error, data) {
                        //res.send(data);
                        console.log(query);
                        console.log(data);
			console.log('ok input');
                    });
                }
                else
                {
		    console.log("already stamp");
                    //콤마 + update
                    var query = 'update user_info set stamp_list = concat((select * from (select stamp_list from user_info s where userid = "' + userid + '") as s), ",", "' + unitCode + '"), stamp_count = (select * from (select stamp_count from user_info ss where userid = "' + userid + '") as ss) + ' + 1 + ' where userid = "' + userid + '"';

                    client.query(query, function (error, data) {
                        console.log(query);
                        console.log(data);
			console.log('ok update');
                    });
                }
            }
        });
    }
    
});

    //실제로 user_info의 stamp_list가 있는지 확인
    app.get('/sarea/sa_info/stampin/:userid', function (req, res) {
        var userid = req.param('userid');

        var query = 'select stamp_list from user_info where userid = "' + userid + '"';

        client.query(query, function (error, data) {
            res.send(data);
            console.log("stampin url : " + data);
        });
    });

//실제로 sa_food_rank에 데이터가 있는지 확인
app.get('/sarea/realin/:unitCode/:food', function (req, res) {
    var unitCode1 = req.param('unitCode');
    var food1 = req.param('food');
    //console.log('get : ' + unitCode1 + ', ' + food1);
    //console.log("in : " + food);

    //var aa = unitCodefood.split(',');
    //var uc = aa[0];
    //var ff = aa[1];

    var query = 'select food_code from sa_food_rank where unitCode = "' + unitCode1 + '" and food = "' + food1 + '"';

    client.query(query, function (error, data) {
        res.send(data);
        console.log(data);
    });
});

//nickname 가져오는 url
app.get('/sarea/input/nickname1/:userid', function (req, res) {
    var userid = req.param('userid');

    var query = 'select nickname from user_info where userid = "' + userid + '"';

    client.query(query, function (error, data) {
        res.send(data);
	console.log(data);
    });

});

/////////////////////////회원 가입
app.post('/sarea/signup', function (req, res) {
    var userid = req.body.userid; //userid
    var nickname = req.body.nickname; //nickname = 이름
    var user_pic = req.body.user_pic; //회원 사진 url 
    
    console.log('userid, nickname, user_pic : ' + userid + '/'+nickname + '/' + user_pic);
    // 데이터베이스 요청을 수행합니다.
    client.query('INSERT INTO user_info (userid, nickname, user_pic) VALUES(?,?,?)', [
        userid, nickname, user_pic
    ], function (error, data) {
        res.send(data);
        console.log(data);
    });
});

/////////////////////////유저 페이지 보여줌
app.get('/sarea/user/:userid', function (req, res) {
    var userid = req.param('userid');

    var query = 'select nickname, stamp_count, stamp_list from user_info where userid = "' + userid + '"';

    client.query(query, function (error, data) {
        res.send(data);
        console.log(data);
    });

});

/////////////////////////지역별로 휴게소 주기
//경기도, 경상도, 강원도, 충청도, 전라도
app.get('/sarea/search_region/:region', function (req, res) {
    var region = req.param('region');
    console.log(region);
    var query = 'select unitCode, unitName, region from sa_info where region = "' + region + '"';

    client.query(query, function (error, data) {
        res.send(data);
        console.log(data);
    });

});

/////////////////////////검색
//키워드가 들어오면 select로 unitCode를 가져오고(-> request로 가져와서 결과 값을 쿼리문의 where 값으로 쓰기) 전체리스트 반환 api처럼 보여주는 select 쿼리문 실행
//키워드 : unitName
app.get('/sarea/search/:keyword', function (req, res) {
    var keyword = req.param('keyword');
    console.log(keyword);
    //request('http://ec2-52-78-118-118.ap-northeast-2.compute.amazonaws.com:3000/sarea/search_unitCode/' + encodeURIComponent(keyword), function(error, res, body) {
        //if (!error && res.statusCode == 200) {
	    //console.log('body : ' + body);
            //var unitCode = (JSON.parse(body))[0].unitCode;
            //console.log("keyword : " + unitCode);

            var query = 'SELECT s2.unitCode, unitName, xValue, yValue, address, (select round(avg(total_score), 2) from sa_con_review s1 where s1.unitCode = s2.unitCode group by s1.unitCode) as avg_total_score FROM sa_info s2 where unitName like "%' + keyword + '%"';

            client.query(query, function (error, data) {
                res.send(data);
                console.log(data);
            });
        //}
    //});

});

/////////////////////////unitCode 가져오기
app.get('/sarea/search_unitCode/:unitName', function (req, res) {
    var unitName = req.param('unitName');
    console.log("search_unitCode : " + unitName);
    var query = 'select unitCode, unitName from sa_info where unitName like "%' + unitName + '%"';

    client.query(query, function (error, data) {
        res.send(data);
	console.log(query);
        console.log(data);
    });

});

/////////////////////////휴게소마다 사진 가져오기
app.get('/sarea/get_pic/:unitName', function (req, res) {
    var unitName = req.param('unitName');
    console.log(encodeURIComponent(unitName + "휴게소"));
    //var url = 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=';
    //url += encodeURIComponent(unitName) + '&key=AIzaSyDqPO1bPwBrQJ8EuuNCApZrkdAC8oTImro';

    //request(url, function (error, res, body) {
      //  if (!error && res.statusCode == 200) {
        //    console.log(body);
       // }
    //});

});

/////////////////////////시설 검색
//키워드 : 시설들
app.get('/sarea/search/:cnum/:conveniences', function (req, res) {
    var conveniences = req.param('conveniences');
    var cnum = Number(req.param('cnum'));
    console.log("search : " + conveniences + ", " + cnum);
    var cons = conveniences.split(','); //cons[0] ~ cons[cnum-1] 까지
    //var temps = " ,수유실,화물휴게소";
    //var t = temps.split(',');

//console.log(t[0] + '/' + t[1] + '/' + t[2]); 
    var query = 'SELECT s2.unitCode, unitName, address, sarea_pic, (select round(avg(total_score), 2) from sa_con_review s1 where s1.unitCode = s2.unitCode group by s1.unitCode) as avg_total_score FROM sa_info s2 where ';
    for (var i = 1; i < cnum+1; i++)
    {
        query += 'convenience like "%' + cons[i] + '%"';
        if (i != cnum)
            query += ' and ';
	console.log(cons[i]);
    }
    

    client.query(query, function (error, data) {
	console.log(query);
        res.send(data);
        console.log(data);

    });

});
app.listen(3000);
