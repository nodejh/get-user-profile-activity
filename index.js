var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var nodemailer = require('nodemailer');

//var transporter = nodemailer.createTransport({
//  service: 'Gmail',
//  auth: {
//    user: 'bsspirit@gmail.com',
//    pass: 'xxxxx'
//  }
//});

var fs = require('fs');
var config = require('./config.js');

// console.log(config);

var app = express();
var items = [];
var count = 0;
//app.get('/', function (req, res, next) {
//  main();
//});
//
//app.listen(4000, function () {
//  console.log('app is listening at port 3000');
//});

//main();

fs.readFile('time.txt','utf8',function (error, data){
  if(error) throw error ;
  console.log(data);
  fs.writeFile('time.txt','aaaaaa', 'utf8', function (werror, wdata) {
    if(werror) throw werror;
    console.log('s');
  });
});



function main() {
  // 用 superagent 去抓取 https://cnodejs.org/ 的内容
  //superagent.get('http://www.zhihu.com/people/da-wang-jiao-wo-lai-xun-shan-30')
  superagent.get(config.zhihu.user_link)
    .end(function (err, sres) {
      // 常规的错误处理
      if (err) {
        return next(err);
      }

      count ++;

      fs.readFile("time.txt","utf8",function (error, data){

        if(error) throw error;

        // 上次动态的时间
        var prev_time = data;
        console.log(prev_time);

        var $ = cheerio.load(sres.text);
        // 最新动态时间
        var latest_time = $('#zh-profile-activity-page-list .zm-profile-section-item.zm-item').eq(0).attr('data-time');
        console.log(latest_time);

        if (latest_time == prev_time) {
          // 没有更新
          console.log(count);

        } else {
          // 有更新
          $('#zh-profile-activity-page-list .zm-profile-section-item.zm-item').each(function (idx, element) {

            // 每个动态
            var $element = $(element);
            // 用户活动基本信息，每个答案的头部
            var $mainText = $element.find('.zm-profile-section-main.zm-profile-section-activity-main.zm-profile-activity-page-item-main');
            var mainText = $mainText.text();
            // 答案基本信息，每个答案的尾部
            var $answer = $element.find('.zm-item-answer ');

            // 用户的三种基本活动：赞同文章／关注问题，赞同回答／回答问题
            // ============================================================================
            // [ '', '蒋航 赞同了 Continuation 中的文章', '', '编程语言相关的好书', '' ]
            // [ '', '蒋航 关注了问题', '', '大学生如何实现一个数据库?', '' ]
            // [ '', '蒋航 赞同了回答', '', '如何学习sqlite源码？', '' ]
            // [ '', '', '', '蒋航 回答了问题', '', '21 岁的你们在过怎样的生活？', '' ]
            // ============================================================================

            // 姓名和活动的文本， 区分（赞同关注）和（回答）
            var nameAndActionString = mainText.split('\n')[1] ? mainText.split('\n')[1] : mainText.split('\n')[3];
            // 姓名和活动的数组 区分（赞同关注问题）和 （赞同关注文章）
            var nameAndActionArray = nameAndActionString.split(' ');

            items.push({
              name: nameAndActionArray[0],
              action: nameAndActionArray[1], // 四种类型：赞同了（文章），关注了问题，赞同了回答，回答了问题
              question: mainText.split('\n')[1] ? mainText.split('\n')[3] : mainText.split('\n')[5],
              question_link: $mainText.find('a.question_link').attr('href') ? $mainText.find('a.question_link').attr('href') : '',
              topic: mainText.split('\n')[4],
              topic_link: $mainText.find('a.topic-link').attr('href') ? $mainText.find('a.topic-link').attr('href') : '',
              article_title: mainText.split('\n')[3],
              article_column: nameAndActionArray[2] ? nameAndActionArray[2] + nameAndActionArray[3] : '',
              article_link: $mainText.find('a.post-link').attr('href'),
              time: $element.find('span.zm-profile-setion-time').text(),
              vote_count: $answer.find('a.zm-item-vote-count').text(),
              answer_author: $answer.find('.answer-head .zm-item-answer-author-wrap a').eq(1).text(),
              answer_author_tips: $answer.find('.answer-head .zm-item-answer-author-wrap strong').text(),
              answer_text: $answer.find('.zm-item-rich-text .zh-summary').text().trim()
            });
            //console.log(mainText.split('\n'));

            // TODO 将数据写入数据库

            // 发送邮件

          });
          //console.log(items.length);
          //console.log(items);
        }
      });



    });
}


var interval = setInterval(function() {
  //main();
  //console.log('a');
  //count ++;

  fs.readFile('time.txt','utf8',function (error, data){
    if(error) throw error ;
    console.log(data);
    if (data == 'a') {
      console.log('=');
    } else {
      fs.writeFile('time.txt','a', 'utf8', function (werror, wdata) {
        if(werror) throw werror;
        //console.log('s');
      });
    }
  });

},1000);


// 终止程序
function stop() {
  clearInterval(interval);
}