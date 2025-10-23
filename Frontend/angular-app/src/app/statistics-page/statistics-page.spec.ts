import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatisticsPageComponent } from './statistics-page';

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect((component as any).selectedRange).toBe('today');
    expect((component as any).selectedChartType).toBe('bar');
    expect((component as any).selectedDataset).toBe('revenue');
  });

  it('should calculate trends correctly', () => {
    (component as any).totalOrders = 1234;
    (component as any).previousOrders = 1100;
    (component as any).totalCustomers = 456;
    (component as any).previousCustomers = 470;
    (component as any).totalRevenue = 7890;
    (component as any).previousRevenue = 7200;

    component.calculateTrends();

    expect((component as any).trendOrders).toBe('up');
    expect((component as any).trendCustomers).toBe('down');
    expect((component as any).trendRevenue).toBe('up');
  });

  it('should update chart for revenue dataset', () => {
    (component as any).selectedDataset = 'revenue';
    component.updateChart();

    expect((component as any).chartData.labels).toEqual(['KW1', 'KW2', 'KW3', 'KW4']);
    expect((component as any).chartData.datasets[0].label).toBe('Umsatz');
    expect((component as any).chartData.datasets[0].data).toEqual([2000, 2500, 1800, 2200]);
  });

  it('should update chart for ordersByWeekday dataset', () => {
    (component as any).selectedDataset = 'ordersByWeekday';
    component.updateChart();

    expect((component as any).chartData.labels).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect((component as any).chartData.datasets[0].label).toBe('Bestellungen/Wochentag');
  });

  it('should update chart for avgOrderValue dataset', () => {
    (component as any).selectedDataset = 'avgOrderValue';
    component.updateChart();

    expect((component as any).chartData.labels).toEqual(['KW1', 'KW2', 'KW3', 'KW4']);
    expect((component as any).chartData.datasets[0].label).toBe('Ø Bestellwert');
  });

  it('should update chart for ordersByDish dataset', () => {
    (component as any).selectedDataset = 'ordersByDish';
    component.updateChart();

    expect((component as any).chartData.labels).toContain('Pizza Margherita');
    expect((component as any).chartData.datasets[0].label).toBe('Bestellungen pro Gericht');
  });

  it('should export chart as PNG', () => {
    const mockCanvas = document.createElement('canvas');
    spyOn(document, 'querySelector').and.returnValue(mockCanvas);
    spyOn(mockCanvas, 'toDataURL').and.returnValue('data:image/png;base64,test');
    spyOn(document.body, 'appendChild').and.callFake(<T extends Node>(node: T): T => node);
  spyOn(document.body, 'removeChild').and.callFake(<T extends Node>(node: T): T => node);




    const linkClickSpy = jasmine.createSpy('click');

    const mockLink = document.createElement('a');
    mockLink.click = linkClickSpy;
    spyOn(document, 'createElement').and.returnValue(mockLink);

   

    expect(mockLink.href).toBe('data:image/png;base64,test');
    expect(mockLink.download).toBe('diagramm.png');
    expect(linkClickSpy).toHaveBeenCalled();
  });
});
