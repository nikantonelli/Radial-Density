Portfolio Item Tree
===================

## Overview

Another take on the Portfolio Items page in Rally. This time using a radial chart style visualisation.

This app will allow you to select a type, then an item in your scope with that type and then it will create a tree of the child artifacts.

The artefacts are arranged in rings to effectively show you the quantity (or size) of stories attached to it and then coloured by the ScheduleState or State (if a portfolio item). The artefact types are from any Portfolio Item type down - and will include stories if you want (set via the options).

So first up, you can get an idea of the progress of artefacts from any portfolio item level down to user story level. You will also be highlighted to the fact that there are dependencies by the fact that the segments flash - every second for ones with predecessors and every 2 seconds for successors.

The 'READY' (green) and 'BLOCKED' (red) flags are show as a bit of border of the required colour.

You can also ask the app to 'SORT' the artefacts based on the sizing that you have asked for. It works clockwise from the top from largest to smallest.

If you shift-CLICK on the segment, the app will give you the dependencies. If you just click on the segment, the app will give you a data panel with more information about the artefact.

![alt text](https://github.com/nikantonelli/Radial-Density/blob/master/Images/overview.png)

If you want to see problems with your data sanity, the segments can be made to go RED:

![alt text](https://github.com/nikantonelli/Radial-Density/blob/master/Images/data_errors.png)

And if you want to get idea of things relative to the Plan Estimate set on stories, you can set the ptions to give you this:

![alt text](https://github.com/nikantonelli/Radial-Density/blob/master/Images/sizedByPlanEst.png)

The data panel currently looks like this

![alt text](https://github.com/nikantonelli/Radial-Density/blob/master/Images/dataPanel.png)

CAVEAT: There are still bugs with the autoloading of the last state set by the user!
