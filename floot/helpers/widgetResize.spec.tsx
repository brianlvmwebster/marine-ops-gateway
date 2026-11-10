import {resizedWidgetWidth} from './widgetResize';
import {layoutInput} from './dashboardWidgets';

describe('Widget resizing',()=>{
 it('snaps at half a column and clamps both drag directions to the available grid',()=>{
  expect(resizedWidgetWidth(2,149,300,4)).toBe(2);
  expect(resizedWidgetWidth(2,151,300,4)).toBe(3);
  expect(resizedWidgetWidth(4,-601,300,4)).toBe(2);
  expect(resizedWidgetWidth(1,-10000,300,4)).toBe(1);
  expect(resizedWidgetWidth(1,10000,300,4)).toBe(4);
  expect(resizedWidgetWidth(4,0,300,2)).toBe(2);
  expect(resizedWidgetWidth(2,100,0,4)).toBe(2);
 });
 it('accepts existing layouts and rejects invalid persisted widget widths',()=>{
  expect(layoutInput.safeParse({version:0,widgets:[{id:'old',type:'today',limit:5}]}).success).toBeTrue();
  expect(layoutInput.safeParse({version:1,columns:4,widgets:[{id:'wide',type:'calendar',limit:5,width:4}]}).success).toBeTrue();
  for(const width of [0,5,1.5])expect(layoutInput.safeParse({version:1,widgets:[{id:'bad',type:'today',limit:5,width}]}).success).toBeFalse();
 });
});
