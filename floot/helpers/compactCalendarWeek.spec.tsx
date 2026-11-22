import React from 'react';
import {render,fireEvent,cleanup} from '@testing-library/react';
import {compactCalendarWeek} from './compactCalendarWeek';
import {CompactCalendarWidget} from '../components/CompactCalendarWidget';
import {emptyJob,type Job} from './jobModel';
import {defaultCalendarSettings} from './dashboardWidgets';
describe('compact calendar week',()=>{
 afterEach(cleanup);
 it('shows Tuesday through Saturday throughout the calendar week',()=>{
  const expected=['2026-11-10','2026-11-11','2026-11-12','2026-11-13','2026-11-14'];
  for(const day of ['2026-11-09','2026-11-10','2026-11-14','2026-11-15'])expect(compactCalendarWeek(day)).toEqual(expected);
 });
 it('navigates across years and daylight saving without changing weekdays',()=>{
  expect(compactCalendarWeek('2026-12-29',1)).toEqual(['2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-01-09']);
  expect(compactCalendarWeek('2026-03-10',-1)).toEqual(['2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07']);
 });
 it('keeps the saved filter on navigation and opens compact job cards',()=>{
  const make=(id:string,date:string,pickup:string):Job=>({id,jobNumber:id,version:1,data:{...emptyJob,firstName:'Jane',lastName:id,year:'2020',make:'Boston Whaler',model:'Montauk',lake:'Long Pond',serviceDate:date,pickup,status:'Scheduled'},eventId:null,syncedVersion:0,syncError:null,remoteEtag:null,updatedAt:new Date()});
  const onOpenJob=jasmine.createSpy('open'),onChange=jasmine.createSpy('change');
  const view=render(<CompactCalendarWidget widget={{id:'calendar',type:'calendar',limit:5,calendar:{...defaultCalendarSettings,pickup:'Road Pickup'}}} jobs={[make('Current','2026-11-10','Road Pickup'),make('Next','2026-11-17','Road Pickup'),make('Excluded','2026-11-17','LVM Slip Customer')]} today="2026-11-10" assignments={[]} disabled={false} onChange={onChange} onOpenJob={onOpenJob} onOpenSchedule={()=>{}}/>);
  expect(view.container.querySelectorAll('section').length).toBe(5);
  expect(view.getByText('Jane Current')).toBeTruthy();
  expect(view.getByText('2020 Boston Whaler Montauk')).toBeTruthy();
  expect(view.getByText('Long Pond')).toBeTruthy();
  fireEvent.click(view.getByLabelText('Next week'));
  expect(view.queryByText('Jane Current')).toBeNull();
  expect(view.queryByText('Jane Excluded')).toBeNull();
  fireEvent.click(view.getByText('Jane Next'));
  expect(onOpenJob).toHaveBeenCalledWith('Next');
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(view.getByText('This Week'));
  expect(view.getByText('Jane Current')).toBeTruthy();
 });
});
