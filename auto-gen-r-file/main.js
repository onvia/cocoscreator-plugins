'use strict';

//说明： 暂时未做场景的自动索引，需要点击按钮手动生成

var path = require('path');
var fs = require('fs');
let utils = require('./utils');

var scriptFolder = "scripts";//脚本文件夹
var sceneFolder = "db://assets/scene/" //场景文件夹
var res_path_url = "db://assets/resources/"; //动态加载资源文件夹
var r_file_url = "db://assets/Script/utils/R.ts" //R 文件位置
var ignorePaths = ['db://assets/resources/Fonts','db://assets/resources/temp']; //忽略文件夹，
var ignoreExt = ['.meta','.pac']; //忽略文件类型
var classes = {};
var isError = false;
var isAutoGenR = false; //自动生成R文件

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

//检查文件夹状态
function checkFolderState() {
    let packageUrl = r_file_url.substring(0, r_file_url.lastIndexOf("/"));
    let packagefspath = Editor.assetdb.urlToFspath(packageUrl);
    let scenefspath = Editor.assetdb.urlToFspath(sceneFolder);

    utils.mkdir(packagefspath);
    utils.mkdir(scenefspath);
    
    return true;
}

function formatFilename(filebasename){
     //如果文件是以数字开始的则
     if (new RegExp("[0-9]").test(filebasename[0])) {
        filebasename = "_" + filebasename;
    } else {}
    //替换特殊字符 每一个括号内为一组
    filebasename = filebasename.replace(/(\s+)|(\-)|(\@)/g, "_");
    // Editor.log("formatFilename ",filebasename);
    return filebasename;
}

//扫描文件
function scanResFiles(dir) {
    let files = fs.readdirSync(dir);
    if (isError) {
        //程序执行错误，拦截
        return;
    }
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let file_path = path.join(dir, file);
        let stat = fs.lstatSync(file_path);
        if (stat.isDirectory()) {
            if(!isIgnorePath(file_path)){
                scanResFiles(file_path);
            }            
        } else {
            if (!isIgnore(file_path)) {
                let item = {
                    path: file_path,
                }
                let ext = path.extname(file_path).toLocaleLowerCase();
                if (ext == "" || !ext) {
                    ext = '.blank';
                }
                ext = ext.replace(".", "");
                let classname = getClassName(ext);

                if (!(classname in classes)) {
                    classes[classname] = {};
                }
                let filebasename = path.basename(file_path);
                filebasename = filebasename.replace('.' + ext, "");

                // filebasename.replace(new RegExp(""));
                //如果文件是以数字开始的则
                if (new RegExp("[0-9]").test(filebasename[0])) {
                    filebasename = "_" + filebasename;
                } else {}
                //替换特殊字符 每一个括号内为一组
                filebasename = filebasename.replace(/(\s+)|(\-)|(\@)/g, "_");
                
                if (!(filebasename in classes[classname])) {
                    classes[classname][filebasename] = [];
                }
                
                let has = classes[classname][filebasename].find(function(element){
                    return element.path == item.path;
                });
                if(has){
                    isError = true;
                    Editor.error(`auto gen r file: 相同文件夹下存在 ${file_path} 文件名重复`);
                    break;
                }
                classes[classname][filebasename].push(item);

                //  else {
                //     isError = true;
                //     Editor.error(`auto gen r file: ${file_path} 文件名重复`);
                //     break;
                // }
            }
        }
    }
}

function getClassName(ext){
    let classname = ext;
    if (ext == "png" || ext == "jpg" || ext == "webp" || ext == "gif") {
        classname = "image"
    }else if(ext == "mp3" || ext == "ogg"){
        classname = "sound"
    }

    return classname;
}


function isIgnore(fileName) {
    let ext = path.extname(fileName).toLocaleLowerCase();
    for (let i = 0; i < ignoreExt.length; i++) {
        const element = ignoreExt[i];
        if(element == ext){
            return true;
        }
    }
    return false;
}

function isIgnorePath(path){
    for (let i = 0; i < ignorePaths.length; i++) {
        let fspath = Editor.assetdb.urlToFspath(ignorePaths[i]);
        if(path == fspath){
            Editor.log("忽略路径：",fspath);
            return true;
        }
    }
    return false;
}

/**
 * @param dir 路径 string 
 * @param filter Function 过滤器
 * @param map 对象 {} 
 */
function scanFiles(dir,filter,map){
    let files = fs.readdirSync(dir);
    if (isError) {
        //程序执行错误，拦截
        Editor.error(`auto gen r file: 程序执行错误`);              
        return;
    }

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let file_path = path.join(dir, file);     
        let stat = fs.lstatSync(file_path);
        if(!filter(file_path) && !stat.isDirectory()){            
            continue;
        }
        if (stat.isDirectory()) {
            scanFiles(file_path,filter,map);
        } else {
            if (isIgnore(file_path)) {//忽略的文件
                continue;
            }
            let item = {
                path: file_path,
            }
            
            let filebasename = path.basename(file_path);            
            if (!(filebasename in map)) {
                map[filebasename] = item;
            } else {
                isError = true;
                Editor.error(`auto gen r file: ${file_path} 文件名重复`);
                break;
            }
        }
    }
}

function genSceneString(){
    let fspath = Editor.assetdb.urlToFspath(sceneFolder);
    let scenes = {};
    Editor.log('auto gen R file:genSceneString begin gen R file');
    scanFiles(fspath,function(file_path){
        let ext = path.extname(file_path).toLocaleLowerCase();
       return ext == ".fire";
    },scenes);

    // Editor.log(`scenes: ${Object.keys(scenes)}`);

    let content = "  //场景开始\n";
    content += `  export let scene = {\n`;
    for (const scene in scenes) {
        let variable = formatFilename(scene);
        variable = variable.replace(".fire","");
        content += `    ${variable}: "${variable}",\n`;
    }
    content += "  }\n"
    content += "  //场景结束\n";
    return content;
}

//局部修改
function localEditScene(){
    genSceneString();

}


function genRun() {
    Editor.log('auto gen R file: begin gen R file');
    isError = false;
    for (const key in classes) {
        delete classes[key];
    }

    //检查 R 文件夹是否存在
    if (!checkFolderState()) {
        return;
    }

    //扫描所有文件夹
    let fspath = Editor.assetdb.urlToFspath(res_path_url);
    scanResFiles(fspath);
    Editor.log('auto gen R file: scanResFiles end');
  
    if (isError) {
        Editor.error(`auto gen r file: 生成失败，文件重复`);
        return;
    }
    let content = "//自动生成的文件，请勿修改\n" +
        "export namespace R{\n";
    for (const classname in classes) {
        content += `  export let ${classname} = {\n`;
        let _class = classes[classname];
        for (const variable in _class) {
            
            let arr = _class[variable];
            if(arr.length == 1){
                let item = arr[0];
                let dburl = Editor.assetdb.fspathToUrl(item.path);
                let ext = path.extname(item.path).toLocaleLowerCase();
                dburl = dburl.replace("db://assets/resources/", "");
                dburl = dburl.replace(ext, '');
                content += `    ${variable}: "${dburl}",\n`;
            }else if(arr.length > 1){// 有同名文件
                
                // Editor.log('auto gen R file: 有同名文件 '+arr.length);
                for (let i = 0; i < arr.length; i++) {
                    const element = arr[i];
                    let dburl1 = Editor.assetdb.fspathToUrl(element.path);
                    let ext1 = path.extname(element.path).toLocaleLowerCase();
                    dburl1 = dburl1.replace("db://assets/resources/", "");
                    dburl1 = dburl1.replace(ext1, '');
                    // dburl1.s
                    let urlarr = dburl1.split("/");
                    let extvar = "";
                    if(urlarr.length > 1){ // 取文件的文件夹名作为变量名的扩展
                        extvar = "_"+urlarr[urlarr.length - 2];
                    }

                    let tmpvariable = variable + extvar

                    content += `    ${tmpvariable}: "${dburl1}",\n`;
                }
            }

        }
        content += "  }\n"
    }

    //场景
    content += genSceneString();
    content += "}\n";



    if (Editor.assetdb.exists(r_file_url)) {
        Editor.assetdb.saveExists(r_file_url, content, function (err, meta) {
            Editor.success("R.ts generate finished!");
        });
    } else {
        Editor.assetdb.create(r_file_url, content, function (err, meta) {
            Editor.success("R.ts generate finished!");
        });
    }
    // Editor.log("文件列表： ",classes);
}

function checkGenR(arg, operation) {
    // Editor.log('auto gen R file: checkGenR ', arg);
    if (arg && arg.length > 0) {
        let pathOrUrl = arg[0].url || arg[0].path;
        Editor.log(`auto gen R file: ${operation_des[operation]} 文件： ${pathOrUrl}`);
        if(pathOrUrl.includes(scriptFolder) && operation == OPERATION_MOVE){
            checkTS(pathOrUrl);
        }
        //自动生成R文件
        if (pathOrUrl.includes("resources") && isAutoGenR) {
            genRun();
        }
    } else if (!arg) {
        Editor.log('auto gen R file: checkGenR error');
    }
}

function checkTS(pathOrUrl){
    if(pathOrUrl.includes("db://assets/")){//转为 fs 路径
        pathOrUrl = Editor.assetdb.urlToFspath(pathOrUrl);
    }
    let filebasename = path.basename(pathOrUrl);
    if(filebasename.includes(".ts")){
        let filename = filebasename.replace(".ts","");
        var script = fs.readFileSync(pathOrUrl, 'utf8');     // 读取构建好的 js
        let newscript = script.replace("export default class NewClass extends cc.Component",`export default class ${filename} extends cc.Component`);
        if(newscript !== script){//有修改
            fs.writeFileSync(pathOrUrl, newscript);
        }
    }
}


module.exports = {
    load() {
        // execute when package loaded

        Editor.log('init auto gen r file plugin');
    },

    unload() {
        // execute when package unloaded
    },

    // register your ipc messages here
    messages: {
        'gen'() {
            isError = false;
            //手动生成文件
            genRun();
            // Editor.assetdb.create( 'db://assets/scripts/autotest/R.ts', 'var foobar = 0;');

        },
        'own-refresh'() {
            Editor.assetdb.refresh('db://assets/', function (err, results) {
                if (err) {
                    Editor.log('auto gen R file: Refresh File Failed', JSON.stringify(err) || err);
                } else {
                    Editor.log("auto gen R file: Refresh File Successfully");
                }
            });
        },
        // 文件操作
        'asset-db:assets-created'(arg1, arg2) {
            checkGenR(arg2, OPERATION_CREATE)
        },
        'asset-db:assets-moved'(arg1, arg2) {
            checkGenR(arg2, OPERATION_MOVE)
        },
        'asset-db:assets-deleted'(arg1, arg2) {
            checkGenR(arg2, OPERATION_DELETE)
        }
    },
};