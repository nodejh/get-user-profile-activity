var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');
var nodemailer = require('nodemailer');
var nocache = require('superagent-no-cache');
var prefix = require('superagent-prefix')('/static');

var fs = require('fs');
var config = require('./config.js');

// console.log(config);

var app = express();
var iterms = [];
var count = 0;

function main() {

  superagent.get(config.zhihu.user_link)
    .end(function (err, sres) {
      // 常规的错误处理
      if (err) {
        console.log(err);
      } else {

        fs.readFile("time.txt","utf8",function (error, data){
          if(error) {
            console.log(error);
          } else {
            // 上次动态的时间
            var prev_time = data;
            console.log('上次动态的时间:');
            console.log(prev_time);

            var $ = cheerio.load(sres.text);
            // 最新动态时间zm-profile-section-item zm-item clearfix
            var latest_time = $('#zh-profile-activity-page-list .zm-profile-section-item.zm-item.clearfix').eq(0).attr('data-time');
            console.log('最新动态时间:');
            console.log(latest_time);

            if (latest_time == prev_time) {
              // 没有更新
              // console.log(count);
              console.log('没有更新!');
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

                iterms.push({
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
              });

              // TODO 将数据写入数据库

              // 发送邮件
              var transporter = nodemailer.createTransport({
                service: config.mail.service,
                auth: {
                  user: config.mail.user,
                  pass: config.mail.password
                }
              });

              // 邮件内容
              var content = '';
              for (var i in iterms) {
                // 拼装邮件内容
                switch (iterms[i].action) {
                  case '赞同了':
                    content += '<p><strong><a href="'+config.zhihu.user_link+'" style="color: red">'+iterms[i].name+'</a></strong> '+ // 蒋航
                      iterms[i].action+ // 赞同了
                      iterms[i].article_column + ':'+ // Continuation中的文章
                      '<a href="'+iterms[i].article_link+'">'+iterms[i].article_title+'</a>' + // 编程语言相关的好书
                      '--- '+iterms[i].time +
                      '<br>' +
                      '</p>';
                    break;
                  case '关注了问题':
                    content += '<p><strong><a href="'+config.zhihu.user_link+'" style="color: red">'+iterms[i].name+'</a></strong> '+ // 蒋航
                      iterms[i].action + // 关注了问题
                      '<a href="'+iterms[i].question_link+'">'+iterms[i].question + '</a>'+ // 大学生如何实现一个数据库
                      '--- '+iterms[i].time +
                      '<br>' +
                      '</p>';
                    break;
                  case '赞同了回答':
                    content += '<p><strong><a href="'+config.zhihu.user_link+'" style="color: red">'+iterms[i].name+'</a></strong> '+ // 蒋航
                      iterms[i].action + // 赞同了回答
                      '<a href="'+iterms[i].question_link+'">'+iterms[i].question + '</a>'+ // 如何学习sqlite源码
                      '--- '+iterms[i].time +
                      '<br>' +
                      '---作者：' + iterms[i].answer_author + ' , '+ iterms[i].answer_author_tips + ':' +
                      '<br>' +
                      '--- <span style="color: rgb(82, 27, 255)">共' + iterms[i].vote_count + '个赞同</span> ' + ' ' + iterms[i].answer_text +
                      '<br>' +
                      '</p>';
                    break;
                  case '回答了问题':
                    content += '<p><strong><a href="'+config.zhihu.user_link+'" style="color: red">'+iterms[i].name+'</a></strong> '+ // 蒋航
                      iterms[i].action + // 赞同了回答
                      '<a href="'+iterms[i].question_link+'">'+iterms[i].question + '</a>'+ // 如何学习sqlite源码
                      '--- '+iterms[i].time +
                      // '<br>' +
                      // '---作者：' + iterms[i].answer_author + ' , '+ iterms[i].answer_author_tips +
                      '<br>' +
                      '--- <span style="color: rgb(82, 27, 255)">共' + iterms[i].vote_count + '个赞同</span> ' + ' ' + iterms[i].answer_text +
                      '<br>' +
                      '</p>';
                    break;
                  default :
                    content = '有未知动态类型: '+ iterms[i].action +'，赶快修改程序～';
                }
              }
              var subject = '' + iterms[0].name + '的最新知乎动态 -- ' + iterms[0].time;
              transporter.sendMail({
                from    : '<' + config.mail.user + '>',
                to      : '<571963318@qq.com>',
                subject : subject,
                html    : content
              }, function(err, res) {
                if (err) {
                  console.log('failed to send mail');
                  console.log(err);
                } else {
                  // 发送邮件成功
                  console.log('send mail success:');
                  console.log(res);
                  fs.writeFile('time.txt', latest_time, 'utf8', function (werror, wdata) {
                    if(werror) {
                      console.log('failed to update time');
                      console.log(werror);
                    } else {
                      console.log('update time success:');
                      console.log(wdata);
                    }
                  });
                }
              });
              //console.log(iterms);
            }
          }
        });
      }
    });
}


var interval = setInterval(function() {
  //main();
  //count ++;
  //console.log(count);

  superagent.get(config.zhihu.user_link)
    .use(prefix)
    .use(nocache)
    .end(function (err, sres) {
      // 常规的错误处理
      if (err) {
        console.log(err);
      } else {
        var $ = cheerio.load(sres.text);
        var latest_time = $('#zh-profile-activity-page-list .zm-profile-section-item.zm-item.clearfix').attr('data-time');
        console.log('最新动态时间:');
        console.log(latest_time);
      }
    });

},1000);


// 终止程序
function stop() {
  clearInterval(interval);
}