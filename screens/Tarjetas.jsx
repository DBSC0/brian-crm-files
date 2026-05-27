// Tarjetas Screen + Detalle

const EMPTY_CARD = { nombre:'', banco:'', titular:'Brian Rodríguez', ultimosDigitos:'', limiteTotal:'', limiteDisponibleEstimado:'', diaCierre:'15', diaVencimiento:'25', moneda:'ARS', estado:'Activa', notas:'' };

// Returns the vencimiento date for a movement using the card's dia_vencimiento day,
// keeping the month/year from the stored fecha_vencimiento_estimada.
function computeNextVencimiento(mov, cards) {
  const card = cards.find(c => c.id === mov.creditCardId);
  if (!card || !mov.fechaVencimientoEstimada) return mov.fechaVencimientoEstimada;
  const base = new Date(mov.fechaVencimientoEstimada + 'T00:00:00');
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(card.diaVencimiento).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Computes monthly billing periods for a card from its movements.
// Each period accumulates the cuota amount (monto / cuotas_tarjeta) per movement.
// If the purchase date is after dia_cierre, the first cuota goes to the next month.
function computeBillingPeriods(card, movements) {
  const periods = {};
  const cardMovs = movements.filter(m => m.creditCardId === card.id && m.estado !== 'Cancelado');

  for (const mov of cardMovs) {
    const cuotaMonto = moneyBase(mov, 'monto') / mov.cuotasTarjeta;
    const compra = new Date(mov.fechaCompra + 'T00:00:00');
    let y = compra.getFullYear();
    let mo = compra.getMonth(); // 0-indexed

    if (compra.getDate() > card.diaCierre) {
      mo++;
      if (mo > 11) { mo = 0; y++; }
    }

    for (let i = 0; i < mov.cuotasTarjeta; i++) {
      let py = y; let pm = mo + i;
      while (pm > 11) { pm -= 12; py++; }
      const key = `${py}-${String(pm + 1).padStart(2, '0')}`;
      const venc = `${py}-${String(pm + 1).padStart(2, '0')}-${String(card.diaVencimiento).padStart(2, '0')}`;

      if (!periods[key]) {
        periods[key] = { key, year: py, month: pm + 1, fechaVencimiento: venc, monto: 0, detalle: [] };
      }
      periods[key].monto += cuotaMonto;
      periods[key].detalle.push({ mov, cuotaNum: i + 1, monto: cuotaMonto });
    }
  }

  return Object.values(periods).sort((a, b) => a.key.localeCompare(b.key));
}

// Computes available credit dynamically:
// disponible = limiteTotal - totalCargado (all active movements) + totalPagado (paid resúmenes)
function computeDisponible(card, movements, stmtPayments) {
  const periods = computeBillingPeriods(card, movements);
  const cardPayments = (stmtPayments || []).filter(p => p.creditCardId === card.id);

  const totalCargado = movements
    .filter(m => m.creditCardId === card.id && m.estado !== 'Cancelado')
    .reduce((s, m) => s + moneyBase(m, 'monto'), 0);

  let totalPagado = 0;
  for (const period of periods) {
    if (cardPayments.some(p => p.año === period.year && p.mes === period.month)) {
      totalPagado += period.monto;
    }
  }

  return {
    disponible: card.limiteTotal - totalCargado + totalPagado,
    totalCargado,
    totalPagado,
  };
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function TarjetaFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = React.useState(initial || EMPTY_CARD);
  React.useEffect(() => { setForm(initial || EMPTY_CARD); }, [open]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar tarjeta' : 'Nueva tarjeta'} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn onClick={() => onSave(form)}>{initial ? 'Guardar cambios' : 'Guardar tarjeta'}</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}><Field label="Nombre de la tarjeta"><Input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Visa Oro Personal" /></Field></div>
        <Field label="Banco"><Input value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Santander" /></Field>
        <Field label="Titular"><Input value={form.titular} onChange={e => set('titular', e.target.value)} /></Field>
        <Field label="Últimos 4 dígitos"><Input value={form.ultimosDigitos} onChange={e => set('ultimosDigitos', e.target.value)} placeholder="1234" /></Field>
        <Field label="Estado"><Select value={form.estado} onChange={e => set('estado', e.target.value)}>{['Activa','Suspendida','Cancelada'].map(s => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Límite total"><Input type="number" value={form.limiteTotal} onChange={e => set('limiteTotal', e.target.value)} placeholder="800000" /></Field>
        <Field label="Disponible estimado"><Input type="number" value={form.limiteDisponibleEstimado} onChange={e => set('limiteDisponibleEstimado', e.target.value)} placeholder="400000" /></Field>
        <Field label="Día de cierre"><Input type="number" value={form.diaCierre} onChange={e => set('diaCierre', e.target.value)} /></Field>
        <Field label="Día de vencimiento"><Input type="number" value={form.diaVencimiento} onChange={e => set('diaVencimiento', e.target.value)} /></Field>
        <div style={{ gridColumn: '1/-1' }}><Field label="Notas"><Textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} /></Field></div>
      </div>
    </Modal>
  );
}

function EditMovimientoTCModal({ open, onClose, mov, onSave }) {
  const [form, setForm] = React.useState({});
  React.useEffect(() => {
    if (mov) setForm({
      descripcion:              mov.descripcion || '',
      monto:                    String(mov.monto || ''),
      cuotasTarjeta:            mov.cuotasTarjeta || 1,
      cuotaActualTarjeta:       mov.cuotaActualTarjeta || 1,
      fechaCompra:              mov.fechaCompra || '',
      fechaCierreEstimada:      mov.fechaCierreEstimada || '',
      fechaVencimientoEstimada: mov.fechaVencimientoEstimada || '',
      estado:                   mov.estado || 'Activo',
    });
  }, [mov]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  if (!mov) return null;
  return (
    <Modal open={open} onClose={onClose} title="Editar movimiento de tarjeta" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn onClick={() => onSave(form)}>💾 Guardar cambios</Btn></>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Descripción">
            <Input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
          </Field>
        </div>
        <Field label="Monto">
          <Input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} />
        </Field>
        <Field label="Cuotas tarjeta">
          <Select value={form.cuotasTarjeta} onChange={e => set('cuotasTarjeta', Number(e.target.value))}>
            {[1,2,3,6,9,12,18,24].map(n => <option key={n} value={n}>{n} cuota{n > 1 ? 's' : ''}</option>)}
          </Select>
        </Field>
        <Field label="Cuota actual">
          <Input type="number" value={form.cuotaActualTarjeta} onChange={e => set('cuotaActualTarjeta', Number(e.target.value))} />
        </Field>
        <Field label="Estado">
          <Select value={form.estado} onChange={e => set('estado', e.target.value)}>
            {['Activo','Pagado','Cancelado'].map(s => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Fecha de compra">
          <Input type="date" value={form.fechaCompra} onChange={e => set('fechaCompra', e.target.value)} />
        </Field>
        <Field label="Fecha cierre estimada">
          <Input type="date" value={form.fechaCierreEstimada} onChange={e => set('fechaCierreEstimada', e.target.value)} />
        </Field>
        <div style={{ gridColumn: '1/-1' }}>
          <Field label="Fecha vencimiento estimada">
            <Input type="date" value={form.fechaVencimientoEstimada} onChange={e => set('fechaVencimientoEstimada', e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function TarjetasScreen({ data, onNav, onDataChange, auth }) {
  const { creditCards, creditCardMovements, clients, operations, creditCardStatementPayments } = data;
  const hp = window.hasPermission || (() => true);
  const [showNew, setShowNew] = React.useState(false);
  const [editMov, setEditMov] = React.useState(null);

  async function saveMov(form) {
    const sb = window.__supabase;
    const { error } = await sb.from('credit_card_movements').update({
      descripcion:                form.descripcion,
      monto:                      parseFloat(form.monto) || 0,
      cuotas_tarjeta:             form.cuotasTarjeta,
      cuota_actual_tarjeta:       form.cuotaActualTarjeta,
      fecha_compra:               form.fechaCompra,
      fecha_cierre_estimada:      form.fechaCierreEstimada,
      fecha_vencimiento_estimada: form.fechaVencimientoEstimada,
      estado:                     form.estado,
    }).eq('id', editMov.id);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    const { data: updated } = await sb.from('credit_card_movements').select('*').order('fecha_compra');
    onDataChange('creditCardMovements', rowsToCamel(updated));
    setEditMov(null);
  }

  async function saveCard(form) {
    if (!hp('cards.create')) { alert('No tenés permiso para crear tarjetas.'); return; }
    const sb = window.__supabase;
    const orgId = auth?.currentOrganization?.id;
    const userId = auth?.user?.id;
    const { data: inserted, error } = await sb.from('credit_cards')
      .insert(toSnake({
        organizationId:           orgId,
        createdBy:                userId || undefined,
        nombre:                   form.nombre,
        banco:                    form.banco,
        titular:                  form.titular,
        ultimosDigitos:           form.ultimosDigitos,
        limiteTotal:              parseFloat(form.limiteTotal) || 0,
        limiteDisponibleEstimado: parseFloat(form.limiteDisponibleEstimado) || 0,
        diaCierre:                parseInt(form.diaCierre),
        diaVencimiento:           parseInt(form.diaVencimiento),
        moneda:                   form.moneda,
        estado:                   form.estado,
        notas:                    form.notas || null,
      }))
      .select().single();
    if (error) { alert('Error al guardar tarjeta: ' + error.message); return; }
    onDataChange('creditCards', [...creditCards, toCamel(inserted)]);
    setShowNew(false);
  }

  const cardColors = ['linear-gradient(135deg,#1e3a5f,#2563eb)', 'linear-gradient(135deg,#1e1b4b,#7c3aed)', 'linear-gradient(135deg,#064e3b,#059669)'];

  return (
    <div>
      <SectionHeader title="Tarjetas de crédito" actions={hp('cards.create') && <Btn onClick={() => setShowNew(true)}>+ Nueva tarjeta</Btn>} />

      {/* Card visuals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {creditCards.map((cc, idx) => {
          const movs = creditCardMovements.filter(m => m.creditCardId === cc.id);
          const { disponible, totalCargado, totalPagado } = computeDisponible(cc, creditCardMovements, creditCardStatementPayments);
          const netDebt = totalCargado - totalPagado;
          const pct = cc.limiteTotal > 0 ? (netDebt / cc.limiteTotal) * 100 : 0;
          return (
            <div key={cc.id} onClick={() => onNav('tarjetas', cc.id)} style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(15,23,42,0.18)', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              {/* Card face */}
              <div style={{ background: cardColors[idx % cardColors.length], padding: '20px 22px', color: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, fontFamily: 'DM Sans, sans-serif' }}>{cc.banco}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'DM Sans, sans-serif' }}>{cc.nombre}</div>
                  </div>
                  <StatusBadge status={cc.estado} />
                </div>
                <div style={{ fontSize: 18, fontFamily: 'DM Mono, monospace', letterSpacing: '0.15em', marginBottom: 16, opacity: 0.9 }}>
                  •••• •••• •••• {cc.ultimosDigitos}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.75 }}>
                  <div><div style={{ marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titular</div><div style={{ fontWeight: 700 }}>{cc.titular}</div></div>
                  <div><div style={{ marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cierre</div><div style={{ fontWeight: 700 }}>Día {cc.diaCierre}</div></div>
                  <div><div style={{ marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vence</div><div style={{ fontWeight: 700 }}>Día {cc.diaVencimiento}</div></div>
                </div>
              </div>
              {/* Card info */}
              <div style={{ background: 'var(--bg-surface)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Límite total</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(cc.limiteTotal)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disponible</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a', fontFamily: 'DM Mono, monospace' }}>{formatCurrency(disponible)}</div>
                  </div>
                </div>
                {/* Usage bar — shows net remaining debt / limit */}
                <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${Math.min(Math.max(pct, 0), 100)}%`, background: pct > 80 ? '#dc2626' : pct > 60 ? '#d97706' : '#4f46e5', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-faint)' }}>
                  <span>Deuda neta: {formatCurrency(netDebt)} ({maskSensitiveNumber(Math.max(pct, 0).toFixed(0), '%')})</span>
                  <span>{movs.length} movimiento{movs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* All movements table */}
      <Card>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>Todos los movimientos de tarjeta</span>
        </div>
        <DataTable
          columns={[
            { key: 'creditCardId', label: 'Tarjeta', render: v => { const cc = creditCards.find(c => c.id === v); return <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{cc?.nombre || '—'}</span>; }},
            { key: 'clientId', label: 'Cliente', render: v => clients.find(c => c.id === v)?.nombre || '—' },
            { key: 'fechaCompra', label: 'Fecha compra', render: v => formatDate(v) },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'monto', label: 'Monto', mono: true, render: v => formatCurrency(v) },
            { key: 'cuotasTarjeta', label: 'Cuotas TC', render: v => `${v}c` },
            { key: 'fechaVencimientoEstimada', label: 'Próx. venc.', render: (v, row) => {
              if (row.estado !== 'Activo') return <span style={{ color: 'var(--text-faint)' }}>—</span>;
              return <span>{formatDate(computeNextVencimiento(row, creditCards))}</span>;
            }},
            { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
            { key: '_acc', label: '', sortable: false, render: (_, row) => (
              <div onClick={e => e.stopPropagation()}>
                <Btn size="sm" variant="ghost" onClick={() => setEditMov(row)}>✏️ Editar</Btn>
              </div>
            )},
          ]}
          data={creditCardMovements}
          emptyMessage="Sin movimientos de tarjeta"
          defaultSortKey="fechaCompra"
          defaultSortDir="desc"
          tableId="tarjetas"
        />
      </Card>

      <TarjetaFormModal open={showNew} onClose={() => setShowNew(false)} onSave={saveCard} />
      <EditMovimientoTCModal open={!!editMov} onClose={() => setEditMov(null)} mov={editMov} onSave={saveMov} />
    </div>
  );
}

function TarjetaDetalleScreen({ cardId, data, onNav, onDataChange, auth }) {
  const hp = window.hasPermission || (() => true);
  const { creditCards, creditCardMovements, clients, operations } = data;
  const cc = creditCards.find(c => c.id === cardId);
  const [activeTab, setActiveTab] = React.useState('resumen');
  const [showEdit, setShowEdit] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [editMov, setEditMov] = React.useState(null);
  const [stmtPayments, setStmtPayments] = React.useState(
    (data.creditCardStatementPayments || []).filter(p => p.creditCardId === cardId)
  );

  // Keep stmtPayments in sync when global data changes (e.g. after reload)
  React.useEffect(() => {
    setStmtPayments((data.creditCardStatementPayments || []).filter(p => p.creditCardId === cardId));
  }, [data.creditCardStatementPayments, cardId]);

  async function saveMov(form) {
    const sb = window.__supabase;
    const { error } = await sb.from('credit_card_movements').update({
      descripcion:                form.descripcion,
      monto:                      parseFloat(form.monto) || 0,
      cuotas_tarjeta:             form.cuotasTarjeta,
      cuota_actual_tarjeta:       form.cuotaActualTarjeta,
      fecha_compra:               form.fechaCompra,
      fecha_cierre_estimada:      form.fechaCierreEstimada,
      fecha_vencimiento_estimada: form.fechaVencimientoEstimada,
      estado:                     form.estado,
    }).eq('id', editMov.id);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    const { data: updated } = await sb.from('credit_card_movements').select('*').order('fecha_compra');
    onDataChange('creditCardMovements', rowsToCamel(updated));
    setEditMov(null);
  }

  if (!cc) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Tarjeta no encontrada.</div>;

  async function updateCard(form) {
    if (!hp('cards.edit')) { alert('No tenés permiso para editar tarjetas.'); return; }
    const sb = window.__supabase;
    const userId = auth?.user?.id;
    const { error } = await sb.from('credit_cards').update(toSnake({ updatedBy: userId || undefined,
      nombre:                   form.nombre,
      banco:                    form.banco,
      titular:                  form.titular,
      ultimosDigitos:           form.ultimosDigitos,
      limiteTotal:              parseFloat(form.limiteTotal) || 0,
      limiteDisponibleEstimado: parseFloat(form.limiteDisponibleEstimado) || 0,
      diaCierre:                parseInt(form.diaCierre),
      diaVencimiento:           parseInt(form.diaVencimiento),
      moneda:                   form.moneda,
      estado:                   form.estado,
      notas:                    form.notas || null,
    })).eq('id', cardId);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    onDataChange('creditCards', data.creditCards.map(c => c.id === cardId ? { ...c, ...form } : c));
    setShowEdit(false);
  }

  async function deleteCard() {
    const hasMovs = creditCardMovements.some(m => m.creditCardId === cardId);
    if (hasMovs) { alert('No se puede eliminar una tarjeta con movimientos registrados.'); return; }
    setConfirmDelete(true);
  }

  async function confirmDeleteCard() {
    if (!hp('cards.delete')) { alert('No tenés permiso para eliminar tarjetas.'); return; }
    setDeleting(true);
    const sb = window.__supabase;
    const { error } = await sb.from('credit_cards').delete().eq('id', cardId);
    setDeleting(false);
    if (error) { alert('Error al eliminar: ' + error.message); return; }
    onDataChange('creditCards', data.creditCards.filter(c => c.id !== cardId));
    onNav('tarjetas');
  }

  async function markPeriodPaid(period) {
    if (!hp('cards.mark_statement_paid')) { alert('No tenés permiso para marcar resúmenes como pagados.'); return; }
    const sb = window.__supabase;
    const orgId = auth?.currentOrganization?.id;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await sb.from('credit_card_statement_payments').upsert(
      { organization_id: orgId, credit_card_id: cardId, año: period.year, mes: period.month, fecha_pago: today },
      { onConflict: 'credit_card_id,año,mes' }
    );
    if (error) { alert('Error al registrar pago: ' + error.message); return; }
    const { data: upd } = await sb.from('credit_card_statement_payments').select('*').order('año').order('mes');
    const camel = rowsToCamel(upd);
    onDataChange('creditCardStatementPayments', camel);
    setStmtPayments(camel.filter(p => p.creditCardId === cardId));
  }

  async function unmarkPeriodPaid(period) {
    const sb = window.__supabase;
    await sb.from('credit_card_statement_payments')
      .delete()
      .eq('credit_card_id', cardId)
      .eq('año', period.year)
      .eq('mes', period.month);
    const { data: upd } = await sb.from('credit_card_statement_payments').select('*').order('año').order('mes');
    const camel = rowsToCamel(upd);
    onDataChange('creditCardStatementPayments', camel);
    setStmtPayments(camel.filter(p => p.creditCardId === cardId));
  }

  const movs = creditCardMovements.filter(m => m.creditCardId === cardId);
  const { disponible, totalCargado, totalPagado: totalPagadoCC } = computeDisponible(cc, creditCardMovements, stmtPayments);
  const assocOps = operations.filter(o => o.creditCardId === cardId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--text-faint)', fontFamily: 'DM Sans, sans-serif', alignItems: 'center' }}>
          <button onClick={() => onNav('tarjetas')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5', fontSize: 12 }}>Tarjetas</button>
          <span>›</span><span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cc.nombre}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="secondary" onClick={() => setShowEdit(true)}>✏️ Editar</Btn>
          <Btn size="sm" variant="danger" onClick={deleteCard}>🗑 Eliminar</Btn>
        </div>
      </div>
      <TarjetaFormModal open={showEdit} onClose={() => setShowEdit(false)} onSave={updateCard} initial={cc} />
      <EditMovimientoTCModal open={!!editMov} onClose={() => setEditMov(null)} mov={editMov} onSave={saveMov} />
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={confirmDeleteCard}
        loading={deleting}
        title="Eliminar tarjeta"
        message={`¿Eliminar la tarjeta "${cc.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar tarjeta"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 16, padding: '24px 22px', color: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>{cc.banco}</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>{cc.nombre}</div>
          <div style={{ fontSize: 20, fontFamily: 'DM Mono, monospace', letterSpacing: '0.15em', marginBottom: 20, opacity: 0.9 }}>•••• •••• •••• {cc.ultimosDigitos}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.8 }}>
            <div><div style={{ textTransform: 'uppercase', marginBottom: 2 }}>Titular</div><div style={{ fontWeight: 700 }}>{cc.titular}</div></div>
            <div><div style={{ textTransform: 'uppercase', marginBottom: 2 }}>Cierre</div><div style={{ fontWeight: 700 }}>Día {cc.diaCierre}</div></div>
            <div><div style={{ textTransform: 'uppercase', marginBottom: 2 }}>Vence</div><div style={{ fontWeight: 700 }}>Día {cc.diaVencimiento}</div></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KPICard label="Límite total" value={formatCurrency(cc.limiteTotal)} accent="slate"  icon="💳" />
          <KPICard label="Disponible"   value={formatCurrency(disponible)}     accent="green"  icon="✅" />
          <KPICard label="Total usado"  value={formatCurrency(totalCargado)}   accent="purple" icon="📊" />
          <KPICard label="Movimientos"  value={movs.length}                    accent="blue"   icon="🔄" sub="operaciones financiadas" />
        </div>
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px' }}>
          <Tabs tabs={[
            { id: 'resumen', label: 'Resumen' },
            { id: 'movimientos', label: 'Movimientos', count: movs.length },
            { id: 'operaciones', label: 'Operaciones asociadas', count: assocOps.length },
            { id: 'resumenes', label: 'Resúmenes' },
          ]} active={activeTab} onChange={setActiveTab} />
        </div>
        <div style={{ padding: 16 }}>
          {activeTab === 'resumen' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Banco', cc.banco],['Titular', cc.titular],['Últimos dígitos', '···· ' + cc.ultimosDigitos],['Límite total', formatCurrency(cc.limiteTotal)],['Disponible', formatCurrency(disponible)],['Pagado acum.', formatCurrency(totalPagadoCC)],['Día cierre', cc.diaCierre],['Día vencimiento', cc.diaVencimiento],['Moneda', cc.moneda],['Estado', cc.estado]].map(([k,v]) => (
                  <div key={k} style={{ padding: '6px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
              {cc.notas && <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-page)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{cc.notas}</div>}
            </div>
          )}
          {activeTab === 'movimientos' && (
            <DataTable tableId="tarjeta-movs" defaultSortKey="fechaCompra" defaultSortDir="desc" columns={[
              { key: 'fechaCompra', label: 'Fecha', render: v => formatDate(v) },
              { key: 'clientId', label: 'Cliente', render: v => clients.find(c => c.id === v)?.nombre || '—' },
              { key: 'descripcion', label: 'Descripción' },
              { key: 'monto', label: 'Monto', mono: true, render: v => formatCurrency(v) },
              { key: 'cuotasTarjeta', label: 'Cuotas TC' },
              { key: 'cuotaActualTarjeta', label: 'Cuota actual', render: (v, row) => `${maskSensitiveNumber(v)}/${maskSensitiveNumber(row.cuotasTarjeta)}` },
              { key: 'fechaVencimientoEstimada', label: 'Próx. venc.', render: (v, row) => {
                if (row.estado !== 'Activo') return <span style={{ color: 'var(--text-faint)' }}>—</span>;
                return <span>{formatDate(computeNextVencimiento(row, creditCards))}</span>;
              }},
              { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
              { key: '_acc', label: '', sortable: false, render: (_, row) => (
                <div onClick={e => e.stopPropagation()}>
                  <Btn size="sm" variant="ghost" onClick={() => setEditMov(row)}>✏️ Editar</Btn>
                </div>
              )},
            ]} data={movs} emptyMessage="Sin movimientos" />
          )}
          {activeTab === 'operaciones' && (
            <DataTable tableId="tarjeta-ops" defaultSortKey="codigo" columns={[
              { key: 'codigo', label: 'Código', mono: true },
              { key: 'clientId', label: 'Cliente', render: v => clients.find(c => c.id === v)?.nombre || '—' },
              { key: 'descripcion', label: 'Descripción' },
              { key: 'totalEsperado', label: 'Total', mono: true, render: v => formatCurrency(v) },
              { key: 'estado', label: 'Estado', render: v => <StatusBadge status={v} /> },
              { key: '_acc', label: '', sortable: false, render: (_, row) => <Btn size="sm" variant="ghost" onClick={() => onNav('operaciones', row.id)}>Ver →</Btn> },
            ]} data={assocOps} emptyMessage="Sin operaciones" />
          )}
          {activeTab === 'resumenes' && (() => {
            const periods = computeBillingPeriods(cc, creditCardMovements);
            const today = new Date().toISOString().slice(0, 10);
            return (
              <div>
                <div style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 13 }}>
                  Monto generado en cada resumen mensual según los movimientos activos. Marcá los períodos que ya pagaste.
                </div>
                {periods.length === 0 ? (
                  <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: 32 }}>Sin movimientos activos para calcular resúmenes.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-page)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Período</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vencimiento</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monto</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detalle</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                          <th style={{ padding: '10px 12px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map(period => {
                          const paid = stmtPayments.find(p => p.año === period.year && p.mes === period.month);
                          const isPast = period.fechaVencimiento < today;
                          const rowBg = paid ? '#f0fdf4' : isPast ? '#fff7ed' : 'white';
                          return (
                            <tr key={period.key} style={{ borderBottom: '1px solid var(--border-subtle)', background: rowBg }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {MONTH_NAMES[period.month - 1]} {period.year}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
                                {formatDate(period.fechaVencimiento)}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {formatCurrency(period.monto)}
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                                {period.detalle.map((d, i) => (
                                  <div key={i} style={{ marginBottom: i < period.detalle.length - 1 ? 2 : 0 }}>
                                    {d.mov.descripcion} — cuota {d.cuotaNum}/{d.mov.cuotasTarjeta} ({formatCurrency(d.monto)})
                                  </div>
                                ))}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {paid
                                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 600 }}>✓ Pagado {formatDate(paid.fechaPago)}</span>
                                  : isPast
                                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#d97706', fontSize: 12, fontWeight: 600 }}>Pendiente</span>
                                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600 }}>Próximo</span>
                                }
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                {!paid
                                  ? <Btn size="sm" variant="secondary" onClick={() => markPeriodPaid(period)}>✓ Pagar</Btn>
                                  : <Btn size="sm" variant="ghost" onClick={() => unmarkPeriodPaid(period)}>↩ Desmarcar</Btn>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { TarjetasScreen, TarjetaDetalleScreen });
