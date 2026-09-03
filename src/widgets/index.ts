import { kpiWidget } from './KpiWidget'
import { lineChartWidget } from './LineChartWidget'
import { registerWidget } from './registry'
import { tableWidget } from './TableWidget'

/**
 * Adding a widget is one file plus one line here. Nothing else in the app
 * needs to know the type exists.
 */
registerWidget(kpiWidget)
registerWidget(lineChartWidget)
registerWidget(tableWidget)

export { lookupWidget, registeredTypes } from './registry'
