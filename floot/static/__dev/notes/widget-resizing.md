# Widget resizing

Each widget now has a horizontal Resize handle at the lower right on desktop. Dragging previews a width snapped to the visible dashboard columns; releasing saves the individual widget's optional width (1–4) through the versioned preference endpoint. Escape or pointer cancellation restores the saved width. Left/Right and Home/End provide keyboard resizing. Failed or stale saves restore the saved layout and show the existing reload action. Dashboard controls are disabled during a drag/save to prevent overlapping layout edits.

Global Columns remains the maximum grid width. Existing widgets without a width retain their prior defaults (one column for job widgets, full row for calendar). Responsive layouts cap actual width to the available two/one columns without overwriting the saved desktop width. Calendar cards reflow within the widget's own width, and show the date once per day group. No job or calendar-sync settings are changed. Outlook remains paused.
