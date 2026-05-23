// Reportes Screen
function ReportesScreen({ data }) {
  const { clients, operations, installments, payments, creditCards, creditCardMovements, cashMovements } = data;
  const [activeTab, setActiveTab] = React.useState('cartera');
  const today = new Date();
  const thisMonth = new Date().toISOString().slice(0,7);

  // Cartera metrics
  const totalInvertido = operations.reduce((s, o) => s + o.costoReal, 0);
  const totalFinanciado = operations.reduce((s, o) => s + o.montoFinanciado, 0);
  const totalEsperado = operations.reduce((s, o) => s + o.totalEsperado, 0);
  const saldoPendiente = installments.reduce((s, i) => s + i.saldoPendiente, 0);
  const vencidas = installments.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
  const saldoVencido = vencidas.reduce((s, i) => s + i.saldoPendiente, 0);
  const saldoAlDia = saldoPendiente - saldoVencido;
  const gananciaEsperada = operations.reduce((s, o) => s + o.gananciaEsperada, 0);
  const totalCobrado = payments.reduce((s, p) => s + p.monto, 0);
  const gananciaRealizada = totalCobrado - totalInvertido;

  // Monthly
  const opsMes = operations.filter(o => o.fechaInicio.startsWith(thisMonth));
  const clientesMes = clients.filter(c => c.createdAt.startsWith(thisMonth));
  const cobradoMes = payments.filter(p => p.fechaPago.startsWith(thisMonth)).reduce((s, p) => s + p.monto, 0);
  const vencimientosMes = installments.filter(i => i.fechaVencimiento.startsWith(thisMonth));
  const moraMes = vencimientosMes.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);

  // Per client
  const clientStats = clients.map(c => {
    const ops = operations.filter(o => o.clientId === c.id);
    const pays = payments.filter(p => p.clientId === c.id);
    const insts = installments.filter(i => i.clientId === c.id);
    const totalPend = insts.reduce((s, i) => s + i.saldoPendiente, 0);
    const totalVenc = insts.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0).reduce((s, i) => s + i.saldoPendiente, 0);
    const overdueInsts = insts.filter(i => new Date(i.fechaVencimiento) < today && i.saldoPendiente > 0);
    const avgDias = overdueInsts.length > 0 ? Math.round(overdueInsts.reduce((s, i) => s + calculateOverdueDays(i.fechaVencimiento), 0) / overdueInsts.length) : 0;
    return { ...c, totalOps: ops.length, totalPagado: pays.reduce((s, p) => s + p.monto, 0), totalPend, totalVenc, avgDias };
  });

  // Cards
  const cardStats = creditCards.map(cc => {
    const movs = creditCardMovements.filter(m => m.creditCardId === cc.id);
    const totalUsado = movs.reduce((s, m) => s + m.monto, 0);
    const assocOps = operations.filter(o => o.creditCardId === cc.id);
    const recoverable = assocOps.reduce((s, o) => s + o.totalEsperado, 0);
    const recovered = assocOps.reduce((s, o) => {
      const opInst = installments.filter(i => i.operationId === o.id);
      return s + opInst.reduce((ss, i) => ss + i.montoPagado, 0);
    }, 0);
    return { ...cc, totalUsado, movimientos: movs.length, operaciones: assocOps.length, recuperado: recovered, pendiente: recoverable - recovered };
  });

  const MiniBar = ({ value, max, color = '#4f46e5' }) => {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
    );
  };

  const tabs = [
    { id: 'cartera', label: 'Cartera' },
    { id: 'mensual', label: 'Mensual' },
    { id: 'clientes', label: 'Por cliente' },
    { id: 'mora', label: 'Mora' },
    { id: 'caja', label: 'Caja' },
    { id: 'tarjetas', label: 'Tarjetas' },
  ];

  return (
    <div>
      <SectionHeader title="Reportes" />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px' }}><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ padding: 20 }}>

          {/* CARTERA */}
          {activeTab === 'cartera' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                <KPICard label="Capital invertido" value={formatCurrency(totalInvertido)} accent="slate" />
                <KPICard label="Total financiado" value={formatCurrency(totalFinanciado)} accent="blue" />
                <KPICard label="Total esperado a cobrar" value={formatCurrency(totalEsperado)} accent="blue" />
                <KPICard label="Saldo pendiente" value={formatCurrency(saldoPendiente)} accent="blue" />
                <KPICard label="Saldo vencido" value={formatCurrency(saldoVencido)} accent="red" />
                <KPICard label="Saldo al día" value={formatCurrency(saldoAlDia)} accent="green" />
                <KPICard label="Ganancia esperada" value={formatCurrency(gananciaEsperada)} accent="purple" />
                <KPICard label="Ganancia realizada" value={formatCurrency(Math.max(0, gananciaRealizada))} accent="green" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Distribución por tipo de operación</div>
                  {['Préstamo en efectivo','Venta financiada','Compra con tarjeta','Otro'].map(tipo => {
                    const ops = operations.filter(o => o.tipo === tipo);
                    const total = ops.reduce((s, o) => s + o.totalEsperado, 0);
                    return (
                      <div key={tipo} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: '#374151' }}>{tipo}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{formatCurrency(total)}</span>
                        </div>
                        <MiniBar value={total} max={totalEsperado} />
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{ops.length} operación{ops.length !== 1 ? 'es' : ''}</div>
                      </div>
                    );
                  })}
                </Card>
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Estado de cuotas</div>
                  {['Pagada','Pendiente','Vencida','Parcial','Refinanciada','Anulada'].map(estado => {
                    const count = installments.filter(i => i.estado === estado).length;
                    const monto = installments.filter(i => i.estado === estado).reduce((s, i) => s + i.montoProgramado, 0);
                    const colors = { Pagada: '#16a34a', Pendiente: '#4f46e5', Vencida: '#dc2626', Parcial: '#d97706', Refinanciada: '#7c3aed', Anulada: '#94a3b8' };
                    return count > 0 ? (
                      <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                        <StatusBadge status={estado} />
                        <div style={{ flex: 1 }}>
                          <MiniBar value={count} max={installments.length} color={colors[estado] || '#94a3b8'} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Mono, monospace', minWidth: 28, textAlign: 'right' }}>{count}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'DM Mono, monospace', minWidth: 90, textAlign: 'right' }}>{formatCurrency(monto)}</span>
                      </div>
                    ) : null;
                  })}
                </Card>
              </div>
            </div>
          )}

          {/* MENSUAL */}
          {activeTab === 'mensual' && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 16 }}>Reporte de mayo 2026</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                <KPICard label="Operaciones nuevas" value={opsMes.length} accent="blue" sub="este mes" />
                <KPICard label="Clientes nuevos" value={clientesMes.length} accent="green" sub="este mes" />
                <KPICard label="Cobrado en el mes" value={formatCurrency(cobradoMes)} accent="green" />
                <KPICard label="Vencimientos del mes" value={vencimientosMes.length} accent="blue" sub="cuotas" />
                <KPICard label="En mora este mes" value={moraMes.length} accent="red" sub="cuotas vencidas" />
                <KPICard label="Mora $" value={formatCurrency(moraMes.reduce((s,i)=>s+i.saldoPendiente,0))} accent="red" />
              </div>
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Cobros mensuales (últimos 6 meses)</div>
                {(() => { const months = []; const d = new Date(); for(let i=5;i>=0;i--){ const m = new Date(d.getFullYear(), d.getMonth()-i, 1); months.push(m.toISOString().slice(0,7)); } return months; })().map(month => {
                  const cobrado = payments.filter(p => p.fechaPago.startsWith(month)).reduce((s, p) => s + p.monto, 0);
                  const maxCobrado = Math.max(...(() => { const months = []; const d = new Date(); for(let i=5;i>=0;i--){ const m = new Date(d.getFullYear(), d.getMonth()-i, 1); months.push(m.toISOString().slice(0,7)); } return months; })().map(m => payments.filter(p => p.fechaPago.startsWith(m)).reduce((s,p)=>s+p.monto,0)));
                  const monthNames = { [month]: new Date(month + '-01').toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }) };
                  return (
                    <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b', width: 50, flexShrink: 0 }}>{monthNames[month]}</span>
                      <div style={{ flex: 1, height: 20, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: maxCobrado > 0 ? `${(cobrado / maxCobrado) * 100}%` : '0%', background: month === new Date().toISOString().slice(0,7) ? '#4f46e5' : '#94a3b8', borderRadius: 4, transition: 'width 0.4s', display: 'flex', alignItems: 'center', paddingLeft: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a', minWidth: 90, textAlign: 'right' }}>{formatCurrency(cobrado)}</span>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* POR CLIENTE */}
          {activeTab === 'clientes' && (
            <DataTable
              tableId="reporte-clientes"
              defaultSortKey="totalPend" defaultSortDir="desc"
              columns={[
                { key: 'nombre', label: 'Cliente', render: (v, row) => <span style={{ fontWeight: 700, color: '#0f172a' }}>{v}</span> },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
                { key: 'totalOps', label: 'Operaciones', render: v => v },
                { key: 'totalPagado', label: 'Pagado', mono: true, render: v => <span style={{ color: '#16a34a', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'totalPend', label: 'Pendiente', mono: true, render: v => formatCurrency(v) },
                { key: 'totalVenc', label: 'Vencido', mono: true, render: v => <span style={{ color: v > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'avgDias', label: 'Prom. días atraso', render: v => v > 0 ? <span style={{ color: '#d97706', fontWeight: 700 }}>{v}d</span> : <span style={{ color: '#94a3b8' }}>—</span> },
              ]}
              data={clientStats}
              emptyMessage="Sin clientes"
            />
          )}

          {/* MORA */}
          {activeTab === 'mora' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
                <KPICard label="Total vencido" value={formatCurrency(saldoVencido)} accent="red" />
                <KPICard label="Cuotas vencidas" value={vencidas.length} accent="red" sub="cuotas" />
                <KPICard label="Clientes en mora" value={new Set(vencidas.map(i=>i.clientId)).size} accent="red" sub="clientes" />
              </div>
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Mora por rango de días</div>
                {[['1-7 días', 1, 7], ['8-15 días', 8, 15], ['16-30 días', 16, 30], ['Más de 30', 31, 9999]].map(([label, min, max]) => {
                  const cuotas = vencidas.filter(i => { const d = calculateOverdueDays(i.fechaVencimiento); return d >= min && d <= max; });
                  const monto = cuotas.reduce((s, i) => s + i.saldoPendiente, 0);
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{maskSensitiveNumber(cuotas.length)} cuota{cuotas.length !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: min >= 30 ? '#7f1d1d' : min >= 16 ? '#dc2626' : '#d97706', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(monto)}</div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* CAJA */}
          {activeTab === 'caja' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                <KPICard label="Entradas totales" value={formatCurrency(cashMovements.filter(m=>m.monto>0).reduce((s,m)=>s+m.monto,0))} accent="green" />
                <KPICard label="Salidas totales" value={formatCurrency(cashMovements.filter(m=>m.monto<0).reduce((s,m)=>s+Math.abs(m.monto),0))} accent="red" />
                <KPICard label="Saldo neto" value={formatCurrency(cashMovements.reduce((s,m)=>s+m.monto,0))} accent="blue" />
              </div>
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 14 }}>Movimientos por tipo</div>
                {['Salida por préstamo','Salida por compra de producto','Entrada por pago','Salida por pago de tarjeta','Gasto','Ajuste manual'].map(tipo => {
                  const movs = cashMovements.filter(m => m.tipo === tipo);
                  const total = movs.reduce((s, m) => s + m.monto, 0);
                  if (movs.length === 0) return null;
                  return (
                    <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #f8fafc', fontSize: 13 }}>
                      <span style={{ color: '#374151' }}>{tipo} <span style={{ color: '#94a3b8', fontSize: 11 }}>({movs.length})</span></span>
                      <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: total > 0 ? '#16a34a' : '#dc2626' }}>{total > 0 ? '+' : ''}{formatCurrency(total)}</span>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}

          {/* TARJETAS */}
          {activeTab === 'tarjetas' && (
            <DataTable
              tableId="reporte-tarjetas"
              defaultSortKey="totalUsado" defaultSortDir="desc"
              columns={[
                { key: 'nombre', label: 'Tarjeta', render: (v, row) => <span style={{ fontWeight: 700 }}>{v} <span style={{ color: '#94a3b8', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>···{row.ultimosDigitos}</span></span> },
                { key: 'banco', label: 'Banco' },
                { key: 'totalUsado', label: 'Total usado', mono: true, render: v => formatCurrency(v) },
                { key: 'movimientos', label: 'Movimientos', render: v => v },
                { key: 'operaciones', label: 'Operaciones', render: v => v },
                { key: 'recuperado', label: 'Recuperado', mono: true, render: v => <span style={{ color: '#16a34a', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'pendiente', label: 'Pend. recuperar', mono: true, render: v => <span style={{ color: v > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{formatCurrency(v)}</span> },
                { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
              ]}
              data={cardStats}
              emptyMessage="Sin tarjetas"
            />
          )}

        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ReportesScreen });
