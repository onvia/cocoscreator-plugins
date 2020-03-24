let fs = require('fs');
let path = require('path');
 class utils {

    //文件夹是否存在，如果不存在则创建
    static mkdir (dir, cb) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            cc.log('utils-> 创建目录：'+dir);
        }
        cb && cb()
    }
}


module.exports = utils