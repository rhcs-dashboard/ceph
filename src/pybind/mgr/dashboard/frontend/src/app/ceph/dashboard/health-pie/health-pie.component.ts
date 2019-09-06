import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';

import * as Chart from 'chart.js';
import * as _ from 'lodash';

import { PluginServiceGlobalRegistrationAndOptions } from 'ng2-charts';

import { ChartTooltip } from '../../../shared/models/chart-tooltip';
import { DimlessBinaryPipe } from '../../../shared/pipes/dimless-binary.pipe';
import { DimlessPipe } from '../../../shared/pipes/dimless.pipe';
import { HealthPieColor } from './health-pie-color.enum';

const defaultFontFamily = 'Overpass, overpass, helvetica, arial, sans-serif';
const defaultFontColorA = '#151515';
const defaultFontColorB = '#72767B';
const tooltipBackgroundColor = 'rgba(0,0,0,0.8)';
Chart.defaults.global.defaultFontFamily = defaultFontFamily;

@Component({
  selector: 'cd-health-pie',
  templateUrl: './health-pie.component.html',
  styleUrls: ['./health-pie.component.scss']
})
export class HealthPieComponent implements OnChanges, OnInit {
  constructor(private dimlessBinary: DimlessBinaryPipe, private dimless: DimlessPipe) {}
  @ViewChild('chartCanvas')
  chartCanvasRef: ElementRef;
  @ViewChild('chartTooltip')
  chartTooltipRef: ElementRef;

  @Input()
  data: any;
  @Input()
  config = {};
  @Input()
  isBytesData = false;
  @Input()
  tooltipFn: any;
  @Input()
  showLabelAsTooltip = false;
  @Output()
  prepareFn = new EventEmitter();

  chartConfig: any = {
    chartType: 'doughnut',
    dataset: [
      {
        label: null,
        borderWidth: 0
      }
    ],
    labels: Array(),
    options: {
      maintainAspectRatio: false,
      cutoutPercentage: 90,
      legend: {
        display: true,
        position: 'right',
        labels: {
          boxWidth: 10,
          usePointStyle: false
        }
        /*
        onClick: (event, legendItem) => {
          this.onLegendClick(event, legendItem);
        }
        */
      },
      /*
      animation: { duration: 0 },
      */
      tooltips: {
        enabled: true,
        displayColors: false,
        backgroundColor: tooltipBackgroundColor,
        cornerRadius: 0,
        bodyFontSize: 14,
        bodyFontStyle: '600',
        position: 'nearest',
        xPadding: 12,
        yPadding: 12,
        callbacks: {
          label: (item, data) =>
            `${data.labels[item.index]} (${data.datasets[item.datasetIndex].data[item.index]}%)`
        }
      },
      title: {
        display: false
      }
    }
  };
  // private hiddenSlices = [];

  public doughnutChartPlugins: PluginServiceGlobalRegistrationAndOptions[] = [
    {
      id: 'center_text',
      beforeDraw(chart) {
        const ctx = chart.ctx;
        if (!chart.options.plugins.center_text || !chart.data.datasets[0].label) {
          return;
        }

        ctx.save();
        const label = chart.data.datasets[0].label.split('\n');

        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = `24px ${defaultFontFamily}`;
        ctx.fillStyle = defaultFontColorA;
        ctx.fillText(label[0], centerX, centerY - 10);

        if (label.length > 1) {
          ctx.font = `14px ${defaultFontFamily}`;
          ctx.fillStyle = defaultFontColorB;
          ctx.fillText(label[1], centerX, centerY + 10);
        }
        ctx.restore();
      }
    }
  ];

  ngOnInit() {
    // An extension to Chart.js to enable rendering some
    // text in the middle of a doughnut
    /*
    Chart.pluginService.register({
      beforeDraw: function(chart) {
        if (!chart.options.center_text) {
          return;
        }

        const width = chart.chart.width,
          height = chart.chart.height,
          ctx = chart.chart.ctx;

        ctx.restore();
        const fontSize = (height / 114).toFixed(2);
        ctx.font = fontSize + 'em sans-serif';
        ctx.textBaseline = 'middle';

        const text = chart.options.center_text,
          textX = Math.round((width - ctx.measureText(text).width) / 2),
          textY = height / 2;

        ctx.fillText(text, textX, textY);
        ctx.save();
      }
    });
    */

    const getStyleTop = (tooltip, positionY) => {
      return positionY + tooltip.caretY - tooltip.height - 10 + 'px';
    };

    const getStyleLeft = (tooltip, positionX) => {
      return positionX + tooltip.caretX + 'px';
    };

    const chartTooltip = new ChartTooltip(
      this.chartCanvasRef,
      this.chartTooltipRef,
      getStyleLeft,
      getStyleTop
    );

    const getBody = (body) => {
      return this.getChartTooltipBody(body);
    };

    chartTooltip.getBody = getBody;

    /*
    this.chartConfig.options.tooltips.custom = (tooltip) => {
      chartTooltip.customTooltips(tooltip);
    };
    */

    this.chartConfig.colors = [
      {
        backgroundColor: [
          HealthPieColor.DEFAULT_GREEN,
          HealthPieColor.DEFAULT_YELLOW,
          HealthPieColor.DEFAULT_ORANGE,
          HealthPieColor.DEFAULT_RED,
          HealthPieColor.DEFAULT_BLUE
        ]
      }
    ];

    _.merge(this.chartConfig, this.config);

    this.prepareFn.emit([this.chartConfig, this.data]);
  }

  ngOnChanges() {
    this.prepareFn.emit([this.chartConfig, this.data]);
    // this.hideSlices();
    this.setChartSliceBorderWidth();
  }
  private getChartTooltipBody(body) {
    const bodySplit = body[0].split(': ');

    if (this.showLabelAsTooltip) {
      return bodySplit[0];
    }

    bodySplit[1] = this.isBytesData
      ? this.dimlessBinary.transform(bodySplit[1])
      : this.dimless.transform(bodySplit[1]);

    return bodySplit.join(': ');
  }

  private setChartSliceBorderWidth() {
    let nonZeroValueSlices = 0;
    _.forEach(this.chartConfig.dataset[0].data, function(slice) {
      if (slice > 0) {
        nonZeroValueSlices += 1;
      }
    });

    this.chartConfig.dataset[0].borderWidth = nonZeroValueSlices > 1 ? 1 : 0;
  }

  /*
  private onLegendClick(event, legendItem) {
    event.stopPropagation();
    this.hiddenSlices[legendItem.index] = !legendItem.hidden;
    this.ngOnChanges();
  }

  private hideSlices() {
    _.forEach(this.chartConfig.dataset[0].data, (_slice, sliceIndex) => {
      if (this.hiddenSlices[sliceIndex]) {
        this.chartConfig.dataset[0].data[sliceIndex] = undefined;
      }
    });
  }
  */
}
