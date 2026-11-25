import React, { useState } from 'react';
import { Alert, Button, Checkbox, Group, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { dockBookingWindow, dockWeekdays } from '../helpers/dockBookingWindow';
export function DockOutlookHours({value, disabled, onSave}: {value?: unknown; disabled: boolean; onSave: (config: unknown)=>Promise<boolean | undefined>}) {
  const [window, setWindow] = useState(()=>dockBookingWindow(value));
  const [message, setMessage] = useState('');
  const changed = JSON.stringify(window) !== JSON.stringify(dockBookingWindow(value));
  async function save() {
    setMessage('');
    try { const validated=dockBookingWindow(window); if(await onSave({action:'availability',bookingWindow:validated})) setMessage('Booking days and hours saved.'); }
    catch(error) { setMessage(error instanceof Error ? error.message : 'Check the booking days and hours.'); }
  }
  return <Stack gap="xs">
    <Text fw={600} size="sm">Booking Days & Hours</Text>
    <Checkbox.Group label="Selectable weekdays" value={window.days.map(String)} onChange={days=>{setWindow({...window,days:days.map(Number).sort((a,b)=>a-b)});setMessage('');}}>
      <Group mt="xs" gap="sm">{dockWeekdays.map((day,index)=><Checkbox key={day} value={String(index)} label={day.slice(0,3)} aria-label={day} disabled={disabled}/>)}</Group>
    </Checkbox.Group>
    <SimpleGrid cols={{base:1,sm:2}}>
      <TextInput type="time" step={1800} label="First appointment time" value={window.start} disabled={disabled} onChange={e=>{setWindow({...window,start:e.currentTarget.value});setMessage('');}}/>
      <TextInput type="time" step={1800} label="Finish appointments by" value={window.end} disabled={disabled} onChange={e=>{setWindow({...window,end:e.currentTarget.value});setMessage('');}}/>
    </SimpleGrid>
    <Text size="xs" c="dimmed">Eastern time. Half-hour increments; each appointment must finish within these hours. Existing Outlook events are unchanged.</Text>
    <Button size="xs" variant="light" disabled={disabled || !changed} onClick={save}>Save Booking Hours</Button>
    {message && <Text size="sm" role="status">{message}</Text>}
  </Stack>;
}
