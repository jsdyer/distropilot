"""Exercise real application behavior at a project subpath; no live API required."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    screenshots=ROOT/'browser-checks';screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT/'dist',Path(temporary)/'distropilot')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=temporary));threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as p:
                browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox'])
                page=browser.new_page(viewport={'width':1360,'height':1000});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                page.route('**/api/distropilot/project?*',lambda route:route.fulfill(json={'fetched_at':'2026-11-25T01:00:00Z','data':[{'repo':'debian_13','version':'3.50','srcname':'sqlite <img src=x>'}]}))
                page.goto(f'http://127.0.0.1:{server.server_port}/distropilot/');page.locator('#workspace').wait_for(state='visible')
                assert page.locator('#table-body tr').count()==4
                page.locator('#project').fill('sqlite');page.locator('#add').click();page.get_by_role('button',name='Remove sqlite',exact=True).wait_for()
                assert '3.50' in page.locator('#table-body').inner_text();assert page.locator('img').count()==0
                page.get_by_label('sqlite migration notes').fill('Check extensions before migration');page.locator('#save').click();page.get_by_role('button',name='Remove sqlite',exact=True).click();page.locator('#restore').click()
                assert page.get_by_label('sqlite migration notes').input_value()=='Check extensions before migration'
                with page.expect_download() as download:page.locator('#export').click()
                value=json.loads(Path(download.value.path()).read_text());assert value['wishlist'][-1]=='sqlite';assert value['capture']['projects']['sqlite']['checked_at']=='2026-11-25T01:00:00Z'
                page.route('**/api/distropilot/project?*',lambda route:route.fulfill(status=429,headers={'Retry-After':'2','Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'Retry-After'},json={'error':'busy'}))
                page.locator('#refresh-project').select_option('sqlite');page.locator('#refresh').click();page.wait_for_function("!document.getElementById('refresh').disabled");assert 'Retry in 2' in page.locator('#status').inner_text(),page.locator('#status').inner_text()
                assert '3.50' in page.locator('#table-body').inner_text()
                page.screenshot(path=str(screenshots/'desktop.png'),full_page=True)
                page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth');page.screenshot(path=str(screenshots/'mobile.png'),full_page=True)
                assert not errors,errors;browser.close()
            print('Browser checks passed: extra project, safe source text, saved evidence, export, rate limit and mobile layout')
        finally:server.shutdown()
if __name__=='__main__':main()
