/* Original clip times remain unchanged; trim only boundaries within a paragraph. */
(function(scope){
 function build(rows){let offset=0;return rows.map((r,i)=>{const sameBefore=i>0&&rows[i-1].paragraph_id===r.paragraph_id,sameAfter=i+1<rows.length&&rows[i+1].paragraph_id===r.paragraph_id;const start=sameBefore?(r.trim_start||0):0,end=sameAfter?(r.trim_end??r.duration):r.duration;const item={start,end,duration:end-start,offset,gap:sameAfter||i===rows.length-1?0:.35};offset+=item.duration+item.gap;return item;});}
 scope.FaustTimeline={build};if(typeof module!=='undefined')module.exports={build};
})(globalThis);
