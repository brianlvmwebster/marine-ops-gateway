import React from 'react';import{createRoot}from'react-dom/client';import{Provider}from'./components/DockTheme';import './scheduler.css';
const form=new URLSearchParams(location.search).get('view')==='form';
const component=form?await import('./components/DockNewJob'):await import('./components/DockMain');if(form)await import('./new-job.css');const View=form?component.DockNewJob:component.DockScheduler;createRoot(document.getElementById('root')!).render(<Provider><View/></Provider>);
