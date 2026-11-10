import React from 'react';
import {FileSpreadsheet} from 'lucide-react';
import {Button} from './Button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from './Dialog';
import {SheetImportPanel} from './SheetImportPanel';
import s from './SheetImportDialog.module.css';

export function SheetImportDialog({className,onChanged,refreshKey}:{className?:string;onChanged:()=>Promise<void>;refreshKey:number}){
 return <Dialog>
  <DialogTrigger asChild><Button variant="ghost" className={className}><FileSpreadsheet size={18}/>Google Sheet jobs</Button></DialogTrigger>
  <DialogContent className={s.dialog}>
   <DialogHeader>
    <DialogTitle>Linked Google Sheet jobs</DialogTitle>
    <DialogDescription>Review the linked records, import status, and source history.</DialogDescription>
   </DialogHeader>
   <SheetImportPanel onChanged={onChanged} refreshKey={refreshKey}/>
  </DialogContent>
 </Dialog>;
}
