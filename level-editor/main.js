'use strict';
let path = require('path');
//只有在 editorfolder 文件夹下的文件才会被导出成 json
let editorfolder = "assets/editor/map/";
let targetpath = "db://assets/resources/level/"; //目标文件夹

let OPERATION_CREATE = 0;
let OPERATION_MOVE = 1;
let OPERATION_DELETE = 2;
let OPERATION_CHANGE = 3;
let OPERATION_REWRITE = 4;
let operation_des = {
    0: "创建",
    1: "移动",
    2: "删除",
    3: "修改",
};

function filter(path,arg,operation,cb){
    if (arg && arg.length > 0) {
        let pathOrUrl = arg[0].path;
        if(pathOrUrl){//把 path 转为 url
            pathOrUrl = Editor.assetdb.fspathToUrl(pathOrUrl);
        }else{
            pathOrUrl = arg[0].url;
        }
        // Editor.log(`level editor: ${operation_des[operation]} 文件： ${pathOrUrl}`);
        if (pathOrUrl.includes(path)) {
             cb(pathOrUrl,operation);
        }
    } else if (!arg) {
        Editor.log('level editor: error');
    }
}
//文件被编辑
function onEidtedFile(pathOrUrl, operation) {
    let url = pathOrUrl;
    
    let filename = path.basename(url);
    filename = filename.substring(0,filename.indexOf("."));

    if (operation == OPERATION_DELETE) { // 如果是删除，则不做数据导出
        let file_url = targetpath + filename + ".json";
        let exists = Editor.assetdb.exists(file_url);
        if(exists){
            Editor.assetdb.delete([file_url]);
        }
        return;
    }
    let uuid = null;
    uuid = Editor.assetdb.urlToUuid(url);
    Editor.Scene.callSceneScript('level-editor', 'mk-tilemap-data', uuid,filename, function (err, data) {
        // Editor.log(`level editor: onEidtedFile mk-tilemap-data `, data);
        write(data);
    });
}


function write(data){
    let name = data.name;
    let content = JSON.stringify(data.json);
    let file_url = targetpath + name + ".json";
    
    Editor.log(`level editor write url: ${file_url}`);    
    let exists = Editor.assetdb.exists(file_url);
    if(exists){
        Editor.assetdb.saveExists(file_url, content, function (err, meta) {
            Editor.success(`level data write in ${file_url}`);
        });
    } else{
        Editor.assetdb.create(file_url, content, function (err, meta) {
            Editor.success(`level data write in ${file_url}`);
        });
    }
}

function rewriteAll(){
    let path = editorfolder.includes("db://") ? editorfolder : "db://"+ editorfolder;
    Editor.assetdb.queryAssets( path+'*', 'tiled-map', function ( err, results ) {
        if(err){
            Editor.log("error");
            return;
        }
        results.forEach(function ( result ) {
            onEidtedFile(result.url,OPERATION_REWRITE);
          });
        Editor.success("rewriteAll end the file size: ",results.length);
      });
}


module.exports = {
  load () {
    // execute when package loaded
    Editor.log(`level editor onload`);    
  },

  unload () {
    // execute when package unloaded
  },

  // register your ipc messages here
  messages: {
    'open' () {
        // open entry panel registered in package.json
        //   Editor.Panel.open('level-editor');
        
      Editor.log('Button clicked!');
    },
    'rewrite'(){//重新生成所有地图文件
        Editor.log('rewriteAll click!');
        rewriteAll();
    },
    // 文件操作
    'asset-db:assets-created'(arg1, arg2) {
        // onEidtedFile(arg2, OPERATION_CREATE);
        filter(editorfolder,arg2,OPERATION_CREATE,onEidtedFile);
    },
    // 'asset-db:assets-moved'(arg1, arg2) {
    //     // onEidtedFile(arg2, OPERATION_MOVE);
        
    //     filter(editorfolder,arg2,OPERATION_MOVE,onEidtedFile);
    // },
    'asset-db:assets-deleted'(arg1, arg2) {
        // onEidtedFile(arg2, OPERATION_DELETE);
        filter(editorfolder,arg2,OPERATION_DELETE,onEidtedFile);
    },
    'asset-db:asset-changed'(arg1, arg2){
        // Editor.log('level editor: 修改文件',arg2);
        if(arg2 && arg2.uuid){//统一格式            
            let url = Editor.assetdb.uuidToUrl(arg2.uuid);
            arg2.url = url;
            if(!Array.isArray(arg2)){
                arg2 = [arg2];
            }
        }
        
        filter(editorfolder,arg2,OPERATION_CHANGE,onEidtedFile);
        // onEidtedFile(arg2,OPERATION_CHANGE)
    }
  },
};