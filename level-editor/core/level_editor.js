
function formatMapData(tiledMapAsset,filename){
    let json = {};
    let tempNode = new cc.Node();
    let tiledMap = tempNode.addComponent(cc.TiledMap);
    tiledMap.tmxAsset = tiledMapAsset;
    let mapSize = tiledMap.getMapSize();
    json["size"] = {
        width:mapSize.width,
        height:mapSize.height
    }
    json["layers"] = {};
    let allLayers = tiledMap.getLayers();    
    for (let k = 0; k < allLayers.length; k++) {
        const layer = allLayers[k];
        let layername = layer.getLayerName();
        let firstGID = 0;

        let tileset = layer.getTileSet();
        if(tileset){
            firstGID = tileset.firstGid
        };
        json["layers"][layername] = {};
        for (let i = 0; i < mapSize.width; i++) {
            for (let j = 0; j < mapSize.height; j++) {
                let gid = layer.getTileGIDAt(i, j);
                if (gid !== 0) {
                    json["layers"][layername][getIdx(mapSize,cc.v2(i,j))] = gid - firstGID;
                }
            }
        }
    }
    tempNode.destroy();

    return {
        name: filename,
        json: json
    };
}
function getIdx (mapSize,pos){   
    var idx = Math.floor(pos.x) + Math.floor(pos.y) * mapSize.width;
    return idx;
}

module.exports = {
    "mk-tilemap-data":function(event,uuid,filename){
        cc.loader.load({ uuid: uuid }, function(err,asstes){
            if(err){
                Editor.log('level_editor-> mk-tilemap-data error uuid:',uuid);
                return;
            }
            let json = formatMapData(asstes,filename);
            if (event.reply) {
                event.reply(null, json);
            }
        });
    }

};