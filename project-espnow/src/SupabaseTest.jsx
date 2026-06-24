import React, { useState } from 'react';
import { supabase } from './lib/supabaseClient';

export default function SupabaseTest() {
  const [status, setStatus] = useState('Esperando acción...');
  const [data, setData] = useState(null);

  const testWrite = async () => {
    setStatus('Escribiendo datos...');
    try {
      const { data, error } = await supabase
        .from('test_table')
        .insert([{ mensaje: 'Hola desde React + ESP-NOW!', creado_en: new Date().toISOString() }])
        .select();

      if (error) throw error;
      setStatus('¡Datos escritos con éxito!');
      setData(data);
    } catch (error) {
      console.error('Error al escribir:', error);
      setStatus(`Error al escribir: ${error.message}`);
    }
  };

  const testRead = async () => {
    setStatus('Leyendo datos...');
    try {
      const { data, error } = await supabase
        .from('test_table')
        .select('*')
        .limit(5);

      if (error) throw error;
      setStatus('¡Datos leídos con éxito!');
      setData(data);
    } catch (error) {
      console.error('Error al leer:', error);
      setStatus(`Error al leer: ${error.message}`);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4 mt-8 max-w-4xl w-full mx-auto">
      <h2 className="text-sm font-semibold tracking-wider text-slate-300 font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
        🗄️ PRUEBA DE CONEXIÓN A SUPABASE
      </h2>

      <div className="flex gap-4">
        <button
          onClick={testWrite}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono py-2 px-4 rounded font-bold border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all text-xs uppercase cursor-pointer"
        >
          Escribir Dato de Prueba
        </button>
        <button
          onClick={testRead}
          className="bg-blue-600 hover:bg-blue-500 text-white font-mono py-2 px-4 rounded font-bold border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all text-xs uppercase cursor-pointer"
        >
          Leer Datos
        </button>
      </div>

      <div className="bg-slate-950 p-3 rounded font-mono text-[10px] text-slate-400 border border-slate-850">
        <p className="mb-2 text-cyan-400">Estado: {status}</p>
        <pre className="overflow-x-auto">
          {data ? JSON.stringify(data, null, 2) : 'No hay datos cargados aún.'}
        </pre>
      </div>
      
      <p className="text-[11px] text-slate-500 italic mt-2">
        Nota: Para que esto funcione, necesitas crear una tabla en Supabase llamada <strong>"test_table"</strong> con las columnas <strong>id</strong> (uuid), <strong>mensaje</strong> (text) y <strong>creado_en</strong> (timestamp). Asegúrate de habilitar RLS y crear políticas (o desactivar RLS por ahora para pruebas rápidas).
      </p>
    </div>
  );
}
