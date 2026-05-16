// Configuración Screen
function ConfiguracionScreen({ data, onDataChange }) {
  const { settings: cfg } = data;
  const [activeTab, setActiveTab] = React.useState('tasas');
  const [editedSettings, setEditedSettings] = React.useState(JSON.parse(JSON.stringify(cfg)));
  const [saved, setSaved] = React.useState(false);

  async function save() {
    const sb = window.__supabase;
    const { error } = await sb.from('app_settings').upsert({
      id: 1,
      tasas_por_cuotas:        editedSettings.tasasPorCuotas,
      metodos_pago:            editedSettings.metodosPago,
      estados_cliente:         editedSettings.estadosCliente,
      estados_operacion:       editedSettings.estadosOperacion,
      estados_cuota:           editedSettings.estadosCuota,
      estados_tarjeta:         editedSettings.estadosTarjeta,
      tipos_operacion:         editedSettings.tiposOperacion,
      datos_prestamista:       editedSettings.datosPrestamista,
      plantillas_whatsapp:     editedSettings.plantillasWhatsapp,
      parametros_financieros:  editedSettings.parametrosFinancieros,
    }, { onConflict: 'id' });
    if (error) { alert('Error al guardar configuración: ' + error.message); return; }
    onDataChange('settings', editedSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const setSetting = (path, value) => {
    setEditedSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const tabs = [
    { id: 'tasas', label: 'Tasas' },
    { id: 'metodos', label: 'Métodos de pago' },
    { id: 'prestamista', label: 'Mis datos' },
    { id: 'parametros', label: 'Parámetros' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'seguridad', label: 'Seguridad' },
  ];

  const Section = ({ title, hint, children }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'DM Sans, sans-serif' }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <SectionHeader title="Configuración" actions={
        <Btn onClick={save}>💾 Guardar cambios</Btn>
      } />
      {saved && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
          ✅ Configuración guardada correctamente.
        </div>
      )}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0 16px' }}><Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} /></div>
        <div style={{ padding: 24 }}>

          {/* TASAS */}
          {activeTab === 'tasas' && (
            <Section title="Tasas por cantidad de cuotas" hint="Cambiar una tasa no afecta operaciones ya creadas. Se aplica solo a nuevas operaciones.">
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#854d0e' }}>
                ⚠️ <strong>Importante:</strong> Cambiar una tasa no afecta operaciones ya creadas. Solo aplica a nuevas operaciones.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {['Cuotas', 'Tasa (%)', 'Activa', 'Vigente desde', 'Vigente hasta', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f8fafc' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editedSettings.tasasPorCuotas.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#0f172a' }}>{row.cuotas}c</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="number" value={row.tasa} onChange={e => {
                            const next = [...editedSettings.tasasPorCuotas];
                            next[i] = { ...next[i], tasa: parseFloat(e.target.value) };
                            setSetting('tasasPorCuotas', next);
                          }} style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'DM Mono, monospace' }} />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input type="checkbox" checked={row.activa} onChange={e => {
                            const next = [...editedSettings.tasasPorCuotas];
                            next[i] = { ...next[i], activa: e.target.checked };
                            setSetting('tasasPorCuotas', next);
                          }} />
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>{formatDate(row.desde)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>{row.hasta ? formatDate(row.hasta) : 'Sin vencimiento'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <StatusBadge status={row.activa ? 'Activo' : 'Anulada'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* MÉTODOS DE PAGO */}
          {activeTab === 'metodos' && (
            <Section title="Métodos de pago disponibles">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
                {editedSettings.metodosPago.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8 }}>
                    <input value={m} onChange={e => {
                      const next = [...editedSettings.metodosPago];
                      next[i] = e.target.value;
                      setSetting('metodosPago', next);
                    }} style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #e2e8f0', fontSize: 13 }} />
                    <button onClick={() => setSetting('metodosPago', editedSettings.metodosPago.filter((_, j) => j !== i))} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>
                ))}
                <Btn size="sm" variant="secondary" onClick={() => setSetting('metodosPago', [...editedSettings.metodosPago, 'Nuevo método'])}>+ Agregar método</Btn>
              </div>
            </Section>
          )}

          {/* PRESTAMISTA */}
          {activeTab === 'prestamista' && (
            <Section title="Datos del prestamista" hint="Estos datos aparecen en recibos y comprobantes internos.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 600 }}>
                <Field label="Nombre">
                  <Input value={editedSettings.datosPrestamista.nombre} onChange={e => setSetting('datosPrestamista.nombre', e.target.value)} />
                </Field>
                <Field label="Teléfono">
                  <Input value={editedSettings.datosPrestamista.telefono} onChange={e => setSetting('datosPrestamista.telefono', e.target.value)} />
                </Field>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Dirección">
                    <Input value={editedSettings.datosPrestamista.direccion} onChange={e => setSetting('datosPrestamista.direccion', e.target.value)} />
                  </Field>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Texto para recibos">
                    <Textarea value={editedSettings.datosPrestamista.textoRecibos} onChange={e => setSetting('datosPrestamista.textoRecibos', e.target.value)} rows={3} />
                  </Field>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <Field label="Texto para comprobantes internos">
                    <Textarea value={editedSettings.datosPrestamista.textoComprobantes} onChange={e => setSetting('datosPrestamista.textoComprobantes', e.target.value)} rows={3} />
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {/* PARÁMETROS FINANCIEROS */}
          {activeTab === 'parametros' && (
            <Section title="Parámetros financieros">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 500 }}>
                <Field label="Moneda">
                  <Select value={editedSettings.parametrosFinancieros.moneda} onChange={e => setSetting('parametrosFinancieros.moneda', e.target.value)}>
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="USD">USD — Dólar estadounidense</option>
                  </Select>
                </Field>
                <Field label="Días de gracia">
                  <Input type="number" value={editedSettings.parametrosFinancieros.diasGracia} onChange={e => setSetting('parametrosFinancieros.diasGracia', parseInt(e.target.value))} />
                </Field>
                {[
                  ['Permitir pagos parciales', 'permitirPagosParciales'],
                  ['Permitir sobrepagos', 'permitirSobrepagos'],
                  ['Permitir condonaciones', 'permitirCondonaciones'],
                  ['Interés por mora activo', 'interesMoraActivo'],
                ].map(([label, key]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, gridColumn: '1/-1' }}>
                    <span style={{ fontSize: 13, color: '#374151', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
                    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                      <input type="checkbox" checked={editedSettings.parametrosFinancieros[key]} onChange={e => setSetting(`parametrosFinancieros.${key}`, e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{
                        position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: 12,
                        background: editedSettings.parametrosFinancieros[key] ? '#4f46e5' : '#cbd5e1',
                        transition: '0.2s',
                        '::before': { content: '' },
                      }} onClick={() => setSetting(`parametrosFinancieros.${key}`, !editedSettings.parametrosFinancieros[key])}>
                        <span style={{
                          position: 'absolute', top: 3, left: editedSettings.parametrosFinancieros[key] ? 23 : 3,
                          width: 18, height: 18, borderRadius: '50%', background: '#fff',
                          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }} />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <Section title="Plantillas de WhatsApp" hint="Usá {cliente}, {monto}, {cuota}, {fecha}, {operacion}, {saldo} como variables.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {editedSettings.plantillasWhatsapp.map((tpl, i) => (
                  <Card key={tpl.id} style={{ padding: 14 }}>
                    <Field label={`Plantilla: ${tpl.nombre}`}>
                      <Textarea value={tpl.texto} onChange={e => {
                        const next = [...editedSettings.plantillasWhatsapp];
                        next[i] = { ...next[i], texto: e.target.value };
                        setSetting('plantillasWhatsapp', next);
                      }} rows={3} />
                    </Field>
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Variables: </span>
                      {['{cliente}','{monto}','{cuota}','{fecha}','{operacion}','{saldo}'].map(v => (
                        <span key={v} style={{ fontSize: 10, padding: '1px 5px', background: '#eef2ff', color: '#4f46e5', borderRadius: 4, marginRight: 4, fontFamily: 'DM Mono, monospace' }}>{v}</span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {/* SEGURIDAD */}
          {activeTab === 'seguridad' && (
            <Section title="Usuarios y roles" hint="Sistema de usuarios mock — no requiere autenticación real.">
              <div style={{ maxWidth: 600 }}>
                {[
                  { nombre: 'Brian Rodríguez', email: 'brian@admin.com', rol: 'Administrador', activo: true },
                  { nombre: 'Cobrador 1 (mock)', email: 'cobrador@crm.com', rol: 'Cobrador', activo: false },
                  { nombre: 'Asistente (mock)', email: 'asistente@crm.com', rol: 'Carga de datos', activo: false },
                  { nombre: 'Auditor (mock)', email: 'auditor@crm.com', rol: 'Solo lectura', activo: false },
                ].map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: u.activo ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: u.activo ? '#fff' : '#94a3b8', flexShrink: 0 }}>
                      {u.nombre[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{u.nombre}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', background: '#eef2ff', color: '#4f46e5', borderRadius: 8, fontWeight: 600 }}>{u.rol}</span>
                    <StatusBadge status={u.activo ? 'Activo' : 'Inactivo'} />
                  </div>
                ))}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  💡 La gestión completa de usuarios y roles estará disponible al conectar con Supabase Auth.
                </div>
              </div>
            </Section>
          )}

        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ConfiguracionScreen });
