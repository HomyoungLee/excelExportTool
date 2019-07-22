var express = require('express');
var formidable = require('formidable');
var xlsx = require('node-xlsx');
var fs =  require('fs');
var path_module = require('path');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });

});

router.post("/upload",function(req,res){  
  var form = new formidable.IncomingForm();   //创建上传表单 
  form.encoding = 'utf-8';        //设置编辑 
  form.uploadDir = './public/excel';     //设置上传目录 文件会自动保存在这里 
  form.keepExtensions = true;     //保留后缀 
  form.parse(req, function (err, fields, files) { 
      if(err){ 
          console.log(err); 
          return;
      }
      console.log(fields)
      let rsjson = JSON.parse(JSON.stringify(files));

      if(rsjson.fileToUpload) {
        let path = rsjson.fileToUpload.path;
        var fileExt = path.substring(path.lastIndexOf('.'));
        if(fileExt.indexOf(".xlsx")===0){
          let rsjson = JSON.parse(JSON.stringify(files));
          let path = rsjson.fileToUpload.path;
          let obj = xlsx.parse(path);
          let excelObj  = obj[0].data;

          const resultObj = {
            zh:{},
            hk:{},
            en:{}
          }
          const uniquekeyCountObj = {
            zh:{},
            hk:{},
            en:{}
          }
          const promiseArr = [];

          const reg = /^(([1-9][0-9]*)|(([0]\.\d{1,2}|[1-9][0-9]*\.\d{1,2})))/;
          const resultArr = excelObj.map(item=>(item.filter(i=>i!=void 0 && !reg.test(i)))).filter(item => item.length>1).slice(1)

          const maxLength = Math.max(...resultArr.map(i=>i.length))

          resultArr.forEach(i=>{

            i.length < maxLength && i.unshift(i[0]) // 如果小于最大长度 填补数组的第一项
            
            const repeatFlag = fields.repeat
            // const key = fields.hump == '1' ? i[fields.key].split(' ').map(i=>i.replace(/[^a-zA-Z0-9]/g,"")).map(i=>i.slice(0, 1).toUpperCase() + i.slice(1) ).join("") : i[fields.key]
            const key = i[fields.key].split(' ').length > 1 ? i[fields.key].split(' ').map(i=>i.replace(/[^a-zA-Z0-9]/g,"")).map(i=>i.slice(0, 1).toUpperCase() + i.slice(1) ).join("") : i[fields.key]
            
            Object.keys(resultObj).forEach( (langKey) => {
              if (repeatFlag == 1)  {
                if( resultObj[langKey][key] ) {
                  uniquekeyCountObj[langKey][key] += 1
                  let newKey = `${key}${uniquekeyCountObj[langKey][key]}`
                  resultObj[langKey][newKey] = i[fields[langKey]]
                } else {
                  resultObj[langKey][key] = i[fields[langKey]]
                  uniquekeyCountObj[langKey][key] = 0;
                } 
              } else {
                resultObj[langKey][key] = i[fields[langKey]]
              }
            })
          })
          
          Object.keys(resultObj).forEach(i => {
            promiseArr.push(Promise.resolve(fs.writeFileSync(path_module.resolve(__dirname, `../public/i18n/${i}.json`), `export default ${JSON.stringify(resultObj[i])}`)))
          })

          Promise.all(promiseArr).then(()=>{
            res.send({
              code: 1,
              data: resultObj
            })
          })
        }
        if(fileExt.indexOf(".xlsx")===-1){
          req.session.notice = {type:'error', message:'操作失败，请导入excel文件'};
          res.redirect('/devices');
        }
      } else {
        res.send({
          code: 0,
          msg: '没有上传excel'
        })
      }
  }) 
});  

module.exports = router;
