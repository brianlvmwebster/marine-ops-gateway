# Repair Orders

Open **Service → Repair Orders** in Marine Ops staging. The management page searches repair order numbers, customer names, vessel descriptions and VINs. It filters by Service status and defaults to the latest promised date. Other sort options include earliest promised date, creation date, most recent update and customer name.

The Promised field uses the Lightspeed Date & Time Promised in Eastern Time where supplied. Repair Order details also show the original creation date. Promised times can be entered on new and editable orders. The promised date does not schedule an appointment or change the service date.

New orders require a shared customer, an available unit assigned to that customer and at least one job line. They start unscheduled. Each line has requested work, status and notes. Open an order to edit existing lines or add more. Use Cancelled to retain a line in the order history when work will not proceed.

Each existing Service Job record is a repair order. Its original RO number, workflow and history carry forward. New orders use the same Service record identity and receive an `RO-<number>` reference. Child job lines are stored separately and reference the Service record UUID. Customer and unit histories continue to link to the Service record. Reviewed and completed Service records stay locked.

## Import reconciliation

Once a source file is available, compare its parent RO numbers as text to the existing Service RO field. Retain leading zeros. Preview uniquely matched rows, missing order numbers and duplicate matches before allowing any writes. Use a stable source job identifier to deduplicate subsequent imports. The RO file itself and its column mapping are still needed for an import preview.
