var g=require('../lib/gestalt');
var ch=[];
function r(x) { ch.push(x) }
var c = (new g.Configuration()).on('state',r)
c.set("a:b:c:d",1);

process.nextTick( function(){
c.get("a:b:c").state('invalid','haha');


process.nextTick( function() { console.log(ch) })
});