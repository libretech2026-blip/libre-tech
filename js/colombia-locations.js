/* ============================================================
   LIBRE TECH - Colombia Locations (colombia-locations.js)
   Departamentos de Colombia y sus municipios.

   Se usa en la calculadora de envío (tienda y panel de administración):
   al elegir un departamento se cargan sus ciudades. Es un catálogo
   estático — no requiere red ni base de datos.
   ============================================================ */

const ColombiaLocations = (() => {
  'use strict';

  const DATA = {
    'Amazonas': ['Leticia', 'Puerto Nariño'],
    'Antioquia': ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Turbo', 'Rionegro', 'Sabaneta', 'Copacabana', 'La Estrella', 'Caldas', 'Girardota', 'Barbosa', 'Caucasia', 'Necoclí', 'Chigorodó', 'Carepa', 'El Bagre', 'Segovia', 'Puerto Berrío', 'Yarumal', 'Santa Fe de Antioquia', 'La Ceja', 'Marinilla', 'Guarne', 'El Carmen de Viboral', 'Sonsón', 'Andes', 'Ciudad Bolívar', 'Támesis', 'Jericó', 'Amalfi', 'Remedios', 'Tarazá', 'Zaragoza', 'Nechí', 'Arboletes', 'San Pedro de Urabá', 'Mutatá', 'Dabeiba', 'Frontino', 'Urrao', 'Betulia', 'Concordia', 'Salgar', 'Fredonia', 'Venecia', 'Santa Bárbara', 'La Pintada', 'Puerto Triunfo', 'Puerto Nare', 'Cisneros', 'Santo Domingo', 'Don Matías', 'Santa Rosa de Osos', 'Entrerríos', 'San Pedro de los Milagros', 'San Jerónimo', 'Sopetrán', 'Ebéjico', 'Heliconia', 'Angelópolis', 'Titiribí', 'Armenia', 'Anzá', 'Caicedo', 'Abriaquí', 'Cañasgordas', 'Giraldo', 'Buriticá', 'Peque', 'Sabanalarga', 'Toledo', 'San Andrés de Cuerquia', 'Briceño', 'Valdivia', 'Ituango', 'Anorí', 'Vegachí', 'Yalí', 'Yolombó', 'Maceo', 'Caracolí', 'San Roque', 'San Rafael', 'San Carlos', 'Granada', 'Cocorná', 'San Francisco', 'San Luis', 'Argelia', 'Nariño', 'Abejorral', 'La Unión', 'El Retiro', 'El Santuario', 'El Peñol', 'Guatapé', 'Alejandría', 'Concepción', 'Barbosa', 'Angostura', 'Campamento', 'Gómez Plata', 'Carolina del Príncipe', 'Belmira', 'Olaya', 'Liborina', 'Uramita', 'Vigía del Fuerte', 'Murindó', 'Hispania', 'Betania', 'Pueblorrico', 'Tarso', 'Jardín', 'Valparaíso', 'Caramanta', 'Montebello', 'El Bagre'],
    'Arauca': ['Arauca', 'Arauquita', 'Cravo Norte', 'Fortul', 'Puerto Rondón', 'Saravena', 'Tame'],
    'Atlántico': ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa', 'Baranoa', 'Sabanalarga', 'Sabanagrande', 'Palmar de Varela', 'Santo Tomás', 'Polonuevo', 'Ponedera', 'Candelaria', 'Campo de la Cruz', 'Santa Lucía', 'Suan', 'Manatí', 'Repelón', 'Luruaco', 'Juan de Acosta', 'Tubará', 'Piojó', 'Usiacurí', 'Villa de San Antonio (Usiacurí)'],
    'Bogotá D.C.': ['Bogotá D.C.'],
    'Bolívar': ['Cartagena', 'Magangué', 'Turbaco', 'Arjona', 'El Carmen de Bolívar', 'Mompós', 'San Juan Nepomuceno', 'Santa Rosa del Sur', 'Simití', 'María la Baja', 'San Jacinto', 'Turbaná', 'Villanueva', 'Santa Catalina', 'Clemencia', 'Santa Rosa de Lima', 'Mahates', 'Calamar', 'Soplaviento', 'San Estanislao', 'San Cristóbal', 'Arroyohondo', 'Córdoba', 'Zambrano', 'El Guamo', 'Talaigua Nuevo', 'Cicuco', 'San Fernando', 'Margarita', 'Hatillo de Loba', 'San Martín de Loba', 'Barranco de Loba', 'Altos del Rosario', 'Regidor', 'Río Viejo', 'Norosí', 'Tiquisio', 'Achí', 'Montecristo', 'San Jacinto del Cauca', 'Pinillos', 'Morales', 'Arenal', 'Cantagallo', 'San Pablo', 'Sur de Bolívar'],
    'Boyacá': ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Paipa', 'Villa de Leyva', 'Puerto Boyacá', 'Moniquirá', 'Garagoa', 'Nobsa', 'Tibasosa', 'Samacá', 'Ventaquemada', 'Ramiriquí', 'Guateque', 'Miraflores', 'Soatá', 'Socha', 'Sotaquirá', 'Combita', 'Motavita', 'Oicatá', 'Toca', 'Siachoque', 'Firavitoba', 'Iza', 'Monguí', 'Mongua', 'Tota', 'Aquitania', 'Cuítiva', 'Pesca', 'Tuta', 'Santa Rosa de Viterbo', 'Belén', 'Cerinza', 'Tutazá', 'Susacón', 'Boavita', 'La Uvita', 'San Mateo', 'Guacamayas', 'El Cocuy', 'Chiscas', 'El Espino', 'Panqueba', 'Güicán', 'Sáchica', 'Sutamarchán', 'Tinjacá', 'Ráquira', 'San Miguel de Sema', 'Saboyá', 'Caldas', 'Buenavista', 'Coper', 'Muzo', 'Quípama', 'Maripí', 'Otanche', 'Pauna', 'Briceño', 'Tununguá', 'Puerto Romero'],
    'Caldas': ['Manizales', 'Villamaría', 'Chinchiná', 'La Dorada', 'Riosucio', 'Anserma', 'Supía', 'Neira', 'Salamina', 'Aguadas', 'Pácora', 'Manzanares', 'Pensilvania', 'Marquetalia', 'Marulanda', 'Samaná', 'Victoria', 'Norcasia', 'La Merced', 'Filadelfia', 'Marmato', 'Belalcázar', 'San José', 'Risaralda', 'Viterbo', 'Palestina'],
    'Caquetá': ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'El Doncello', 'Cartagena del Chairá', 'La Montañita', 'Belén de los Andaquíes', 'Curillo', 'El Paujil', 'Albania', 'Milán', 'Morelia', 'San José del Fragua', 'Solano', 'Solita', 'Valparaíso'],
    'Casanare': ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Monterrey', 'Paz de Ariporo', 'Trinidad', 'Orocué', 'Maní', 'Hato Corozal', 'Nunchía', 'Pore', 'Sácama', 'La Salina', 'Recetor', 'Chámeza', 'San Luis de Palenque', 'Támara', 'Sabanalarga'],
    'Cauca': ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía (El Bordo)', 'Piendamó', 'Corinto', 'Miranda', 'Caloto', 'Villa Rica', 'Padilla', 'Guachené', 'Timbío', 'El Tambo', 'Cajibío', 'Morales', 'Suárez', 'Buenos Aires', 'Silvia', 'Totoró', 'Inzá', 'Páez (Belalcázar)', 'La Vega', 'Almaguer', 'Bolívar', 'San Sebastián', 'Santa Rosa', 'Sucre', 'Mercaderes', 'Balboa', 'Argelia', 'Timbiquí', 'Guapi', 'López de Micay', 'Rosas', 'Sotará', 'Puracé', 'Jambaló', 'Toribío', 'Caldono', 'Piamonte'],
    'Cesar': ['Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'La Jagua de Ibirico', 'Curumaní', 'El Copey', 'Chimichagua', 'San Alberto', 'San Martín', 'Pailitas', 'Chiriguaná', 'Becerril', 'La Paz', 'Manaure Balcón del Cesar', 'Pueblo Bello', 'La Gloria', 'Gamarra', 'González', 'Río de Oro', 'Astrea', 'El Paso', 'Tamalameque', 'Pelaya', 'San Diego'],
    'Chocó': ['Quibdó', 'Istmina', 'Riosucio', 'Tadó', 'Condoto', 'Acandí', 'Bahía Solano', 'Nuquí', 'Unguía', 'Carmen del Darién', 'Bojayá', 'Medio Atrato', 'Lloró', 'Bagadó', 'Atrato', 'Cértegui', 'Unión Panamericana', 'Río Iró', 'Río Quito', 'Novita', 'San José del Palmar', 'Sipí', 'Bajo Baudó (Pizarro)', 'Medio Baudó', 'Alto Baudó (Pie de Pato)', 'Litoral del San Juan', 'El Cantón del San Pablo', 'Juradó', 'El Carmen de Atrato', 'Belén de Bajirá'],
    'Córdoba': ['Montería', 'Lorica', 'Cereté', 'Sahagún', 'Montelíbano', 'Planeta Rica', 'Tierralta', 'Ciénaga de Oro', 'Chinú', 'San Pelayo', 'Puerto Libertador', 'San Antero', 'Moñitos', 'Los Córdobas', 'Canalete', 'Puerto Escondido', 'San Bernardo del Viento', 'Purísima', 'Momil', 'Chimá', 'Cotorra', 'San Carlos', 'San José de Uré', 'Valencia', 'Tuchín', 'La Apartada', 'Ayapel', 'Buenavista', 'Pueblo Nuevo', 'San Andrés de Sotavento'],
    'Cundinamarca': ['Soacha', 'Fusagasugá', 'Facatativá', 'Zipaquirá', 'Chía', 'Girardot', 'Mosquera', 'Madrid', 'Funza', 'Cajicá', 'Sibaté', 'Tocancipá', 'Cota', 'La Calera', 'Sopó', 'Tabio', 'Tenjo', 'Gachancipá', 'Ubaté', 'Villeta', 'La Mesa', 'Anapoima', 'Tocaima', 'Ricaurte', 'Agua de Dios', 'Nilo', 'Silvania', 'Pasca', 'Arbeláez', 'San Bernardo', 'Cabrera', 'Venecia', 'Tibacuy', 'Granada', 'El Colegio', 'Viotá', 'Apulo', 'Cachipay', 'Zipacón', 'Bojacá', 'El Rosal', 'Subachoque', 'San Francisco', 'Supatá', 'La Vega', 'Nocaima', 'Vergara', 'Nimaima', 'Quebradanegra', 'Útica', 'La Peña', 'Caparrapí', 'Puerto Salgar', 'Guaduas', 'Chaguaní', 'Bituima', 'Vianí', 'San Juan de Rioseco', 'Pulí', 'Beltrán', 'Guataquí', 'Nariño', 'Jerusalén', 'Quipile', 'Anolaima', 'Albán', 'Sasaima', 'Guayabal de Síquima', 'Cogua', 'Nemocón', 'Suesca', 'Sesquilé', 'Guatavita', 'Guasca', 'Junín', 'Gachetá', 'Gama', 'Ubalá', 'Gachalá', 'Fómeque', 'Choachí', 'Ubaque', 'Chipaque', 'Cáqueza', 'Fosca', 'Guayabetal', 'Quetame', 'Une', 'Gutiérrez', 'Manta', 'Tibirita', 'Machetá', 'Chocontá', 'Villapinzón', 'Lenguazaque', 'Cucunubá', 'Sutatausa', 'Tausa', 'Carmen de Carupa', 'Susa', 'Simijaca', 'Fúquene', 'Guachetá', 'San Cayetano', 'Pacho', 'Villagómez', 'Topaipí', 'Paime', 'Yacopí', 'El Peñón', 'La Palma', 'Medina', 'Paratebueno'],
    'Guainía': ['Inírida'],
    'Guaviare': ['San José del Guaviare', 'El Retorno', 'Calamar', 'Miraflores'],
    'Huila': ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Gigante', 'Palermo', 'Rivera', 'Aipe', 'Timaná', 'Suaza', 'Acevedo', 'San Agustín', 'Isnos', 'Saladoblanco', 'Oporapa', 'Tarqui', 'Altamira', 'Guadalupe', 'Agrado', 'Paicol', 'Tesalia', 'Nátaga', 'Íquira', 'Santa María', 'Teruel', 'Yaguará', 'Hobo', 'Algeciras', 'Baraya', 'Tello', 'Villavieja', 'Colombia', 'Elías', 'Pital', 'Salado Blanco'],
    'La Guajira': ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'San Juan del Cesar', 'Fonseca', 'Barrancas', 'Villanueva', 'Albania', 'Dibulla', 'Distracción', 'El Molino', 'Hatonuevo', 'La Jagua del Pilar', 'Urumita'],
    'Magdalena': ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Aracataca', 'Zona Bananera', 'Pivijay', 'Santa Ana', 'Guamal', 'Pueblo Viejo', 'Sitionuevo', 'Remolino', 'Salamina', 'El Retén', 'Algarrobo', 'Ariguaní (El Difícil)', 'Chibolo', 'Nueva Granada', 'Sabanas de San Ángel', 'Tenerife', 'Zapayán', 'Concordia', 'Pedraza', 'Cerro de San Antonio', 'El Piñón', 'San Zenón', 'San Sebastián de Buenavista', 'Santa Bárbara de Pinto', 'Pijiño del Carmen'],
    'Meta': ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'Puerto Gaitán', 'San Martín', 'Cumaral', 'Restrepo', 'Guamal', 'Castilla la Nueva', 'San Carlos de Guaroa', 'Barranca de Upía', 'Cabuyaro', 'El Calvario', 'El Castillo', 'El Dorado', 'Fuente de Oro', 'La Macarena', 'Lejanías', 'Mapiripán', 'Mesetas', 'Puerto Concordia', 'Puerto Lleras', 'Puerto Rico', 'San Juan de Arama', 'San Juanito', 'Uribe', 'Vista Hermosa', 'Cubarral'],
    'Nariño': ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión', 'Samaniego', 'Sandoná', 'Barbacoas', 'La Cruz', 'Buesaco', 'El Charco', 'Consacá', 'Yacuanquer', 'Tangua', 'Guaitarilla', 'Ospina', 'Imués', 'Iles', 'Contadero', 'Córdoba', 'Potosí', 'Puerres', 'Pupiales', 'Gualmatán', 'Aldana', 'Cuaspud (Carlosama)', 'Guachucal', 'Cumbal', 'Ricaurte', 'Mallama', 'Providencia', 'Santacruz', 'Sapuyes', 'Linares', 'Ancuya', 'La Llanada', 'Los Andes (Sotomayor)', 'El Tambo', 'El Peñol', 'Taminango', 'San Lorenzo', 'Arboleda', 'San Pedro de Cartago', 'Belén', 'Colón (Génova)', 'San Bernardo', 'Albán (San José)', 'San Pablo', 'La Florida', 'Nariño', 'Chachagüí', 'Roberto Payán', 'Magüí Payán', 'Olaya Herrera', 'Mosquera', 'Francisco Pizarro', 'La Tola', 'Santa Bárbara (Iscuandé)'],
    'Norte de Santander': ['Cúcuta', 'Ocaña', 'Villa del Rosario', 'Los Patios', 'Pamplona', 'Tibú', 'El Zulia', 'Sardinata', 'Chinácota', 'Ábrego', 'Convención', 'El Carmen', 'Teorama', 'San Calixto', 'Hacarí', 'La Playa de Belén', 'Bochalema', 'Cáchira', 'Cácota', 'Chitagá', 'Cucutilla', 'Durania', 'Gramalote', 'Herrán', 'La Esperanza', 'Labateca', 'Lourdes', 'Mutiscua', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas', 'San Cayetano', 'Santiago', 'Silos', 'Toledo', 'Villa Caro', 'Bucarasica', 'El Tarra'],
    'Putumayo': ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez (La Hormiga)', 'Villagarzón', 'Puerto Caicedo', 'Puerto Guzmán', 'San Miguel', 'Sibundoy', 'Colón', 'Santiago', 'San Francisco', 'Leguízamo'],
    'Quindío': ['Armenia', 'Calarcá', 'La Tebaida', 'Montenegro', 'Quimbaya', 'Circasia', 'Filandia', 'Salento', 'Córdoba', 'Buenavista', 'Génova', 'Pijao'],
    'Risaralda': ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella', 'Quinchía', 'Belén de Umbría', 'Apía', 'Santuario', 'La Celia', 'Balboa', 'Guática', 'Mistrató', 'Pueblo Rico'],
    'San Andrés y Providencia': ['San Andrés', 'Providencia', 'Santa Catalina'],
    'Santander': ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'San Gil', 'Socorro', 'Barbosa', 'Málaga', 'Vélez', 'Zapatoca', 'Lebrija', 'Rionegro', 'Sabana de Torres', 'Puerto Wilches', 'Cimitarra', 'Landázuri', 'Bolívar', 'El Playón', 'Matanza', 'Charta', 'Tona', 'Santa Bárbara', 'California', 'Vetas', 'Suratá', 'Los Santos', 'Curití', 'Pinchote', 'Villanueva', 'Barichara', 'Cabrera', 'Charalá', 'Ocamonte', 'Mogotes', 'San Joaquín', 'Onzaga', 'Coromoro', 'Encino', 'Gámbita', 'Oiba', 'Guapotá', 'Palmar', 'Hato', 'Palmas del Socorro', 'Simacota', 'Confines', 'Contratación', 'Guadalupe', 'Chima', 'Galán', 'El Guacamayo', 'Santa Helena del Opón', 'La Paz', 'Aguada', 'Chipatá', 'Güepsa', 'San Benito', 'Puente Nacional', 'Jesús María', 'Sucre', 'La Belleza', 'Florián', 'Albania', 'Guavatá', 'Concepción', 'Cerrito', 'Enciso', 'San Andrés', 'Molagavita', 'San José de Miranda', 'Capitanejo', 'Macaravita', 'Carcasí', 'Guaca', 'Betulia', 'San Vicente de Chucurí', 'El Carmen de Chucurí', 'Puerto Parra', 'Suaita', 'Valle de San José'],
    'Sucre': ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos', 'Tolú', 'Coveñas', 'San Onofre', 'Since', 'Los Palmitos', 'Morroa', 'Ovejas', 'Chalán', 'Colosó', 'Toluviejo', 'Palmito', 'Buenavista', 'Galeras', 'El Roble', 'San Juan de Betulia', 'San Pedro', 'La Unión', 'Caimito', 'San Benito Abad', 'Sucre', 'Majagual', 'Guaranda'],
    'Tolima': ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Líbano', 'Chaparral', 'Mariquita', 'Flandes', 'Purificación', 'Guamo', 'Fresno', 'Lérida', 'Venadillo', 'Ambalema', 'Armero Guayabal', 'Falan', 'Palocabildo', 'Casabianca', 'Villahermosa', 'Murillo', 'Santa Isabel', 'Anzoátegui', 'Alvarado', 'Piedras', 'Coello', 'San Luis', 'Valle de San Juan', 'Rovira', 'Roncesvalles', 'San Antonio', 'Ortega', 'Coyaima', 'Natagaima', 'Prado', 'Dolores', 'Alpujarra', 'Villarrica', 'Cunday', 'Icononzo', 'Carmen de Apicalá', 'Suárez', 'Saldaña', 'Ataco', 'Planadas', 'Rioblanco', 'Herveo', 'Cajamarca'],
    'Valle del Cauca': ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Cartago', 'Buga', 'Jamundí', 'Yumbo', 'Candelaria', 'Florida', 'Pradera', 'Zarzal', 'Roldanillo', 'La Unión', 'Sevilla', 'Caicedonia', 'Dagua', 'La Cumbre', 'Restrepo', 'Vijes', 'Yotoco', 'Riofrío', 'Trujillo', 'Bolívar', 'Bugalagrande', 'Andalucía', 'San Pedro', 'Guacarí', 'Ginebra', 'El Cerrito', 'Toro', 'Obando', 'La Victoria', 'Ulloa', 'Alcalá', 'Ansermanuevo', 'El Águila', 'El Cairo', 'Argelia', 'Versalles', 'El Dovio', 'Calima (Darién)'],
    'Vaupés': ['Mitú', 'Carurú', 'Taraira'],
    'Vichada': ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo']
  };

  /** Lista de departamentos ordenada alfabéticamente. */
  function getDepartments() {
    return Object.keys(DATA).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  /** Municipios de un departamento, ordenados. Array vacío si no existe. */
  function getCities(department) {
    const cities = DATA[department];
    if (!cities) return [];
    return [...cities].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  /** Rellena un <select> con los departamentos. */
  function fillDepartmentSelect(select, selected) {
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona un departamento</option>' +
      getDepartments().map(d => `<option value="${d}"${d === selected ? ' selected' : ''}>${d}</option>`).join('');
  }

  /** Rellena un <select> con los municipios del departamento indicado. */
  function fillCitySelect(select, department, selected) {
    if (!select) return;
    const cities = getCities(department);
    if (cities.length === 0) {
      select.innerHTML = '<option value="">Selecciona primero un departamento</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = '<option value="">Selecciona una ciudad</option>' +
      cities.map(c => `<option value="${c}"${c === selected ? ' selected' : ''}>${c}</option>`).join('');
  }

  /** Departamento al que pertenece una ciudad (primera coincidencia), o ''. */
  function findDepartmentByCity(city) {
    const target = String(city || '').trim().toLowerCase();
    if (!target) return '';
    for (const [dept, cities] of Object.entries(DATA)) {
      if (cities.some(c => c.toLowerCase() === target)) return dept;
    }
    return '';
  }

  return { DATA, getDepartments, getCities, fillDepartmentSelect, fillCitySelect, findDepartmentByCity };
})();
