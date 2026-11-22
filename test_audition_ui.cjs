/* Real Chrome verification of the current portal, no paid TTS requests. */
require('child_process').execFileSync('python',['-X','utf8','verify_audition_browser.py'],{stdio:'inherit'});
