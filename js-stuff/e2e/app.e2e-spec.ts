import { JsStuffPage } from './app.po';

describe('js-stuff App', () => {
  let page: JsStuffPage;

  beforeEach(() => {
    page = new JsStuffPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
