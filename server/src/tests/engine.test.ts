import { roomEngine } from '../engine/roomEngine';
import { storyEngine } from '../story/storyEngine';
import { GAME_CATALOG, GameInfo } from '../data/gameCatalog';
import assert from 'assert';
import fs from 'fs';
import path from 'path';

async function runAutomatedTests() {
  console.log('=========================================');
  console.log('🪄 INICIANDO PRUEBAS AUTOMATIZADAS DE HOGWARTS GAME NIGHT V2');
  console.log('=========================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`✅ [EXITO] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`❌ [FALLO] ${name}`);
      console.error(`   Detalle: ${e.message || e}`);
      failed++;
    }
  }

  // 1. Pruebas de RoomEngine e Integridad de Salas
  console.log('--- Pruebas de Motor de Salas (RoomEngine) ---');
  
  let testRoomCode = '';
  test('Crear sala genera un código único de 4 letras y persiste en disco', () => {
    testRoomCode = roomEngine.createRoom();
    assert.strictEqual(typeof testRoomCode, 'string');
    assert.strictEqual(testRoomCode.length, 4);

    const room = roomEngine.getRoom(testRoomCode);
    assert.ok(room, 'La sala debe existir en el motor');
    assert.strictEqual(room.status, 'lobby');

    // Verificar archivo de respaldo
    const backupPath = path.join(process.cwd(), 'data', 'rooms_backup.json');
    assert.ok(fs.existsSync(backupPath), 'El archivo rooms_backup.json debe haber sido creado');
  });

  test('Validación estricta de jugador: Nombre obligatorio y sanitización', () => {
    const resEmpty = roomEngine.addPlayer(testRoomCode, {
      clientId: 'c_test1',
      name: '   ',
      house: 'Gryffindor',
      gender: 'wizard'
    });
    assert.strictEqual(resEmpty.success, false);
    assert.strictEqual(resEmpty.error, 'El nombre es obligatorio');

    const resValid = roomEngine.addPlayer(testRoomCode, {
      clientId: 'c_test2',
      name: ' Harry Potter Extra Largo ',
      house: 'Gryffindor',
      gender: 'wizard'
    });
    assert.strictEqual(resValid.success, true);

    const player = roomEngine.getPlayer(testRoomCode, 'c_test2');
    assert.ok(player);
    assert.strictEqual(player.name, 'Harry Potter Extra L', 'El nombre debe ser recortado y sanitizado');
    assert.strictEqual(player.isHost, true, 'El primer jugador debe ser asignado como anfitrión (host)');
  });

  test('Regla de negocio: Máximo 2 jugadores por casa', () => {
    // Ya hay 1 Gryffindor (c_test2)
    const resG2 = roomEngine.addPlayer(testRoomCode, {
      clientId: 'c_test3',
      name: 'Hermione',
      house: 'Gryffindor',
      gender: 'witch'
    });
    assert.strictEqual(resG2.success, true);

    // Intentar agregar un 3er Gryffindor
    const resG3 = roomEngine.addPlayer(testRoomCode, {
      clientId: 'c_test4',
      name: 'Ron',
      house: 'Gryffindor',
      gender: 'wizard'
    });
    assert.strictEqual(resG3.success, false);
    assert.ok(resG3.error?.includes('ya tiene 2 miembros'));
  });

  test('Regla de negocio: Nombre único en la sala', () => {
    const resDup = roomEngine.addPlayer(testRoomCode, {
      clientId: 'c_test5',
      name: 'Hermione', // Mismo nombre que c_test3
      house: 'Ravenclaw',
      gender: 'witch'
    });
    assert.strictEqual(resDup.success, false);
    assert.strictEqual(resDup.error, 'Ese nombre ya está en uso');
  });

  // 2. Pruebas de StoryEngine y Sincronización de Minijuegos
  console.log('\n--- Pruebas de Motor de Historia (StoryEngine) ---');

  let storyState: any = null;
  test('Inicializar historia Torneo Mágico Rotativo', () => {
    storyState = storyEngine.initStory('copa_rotativa_magica');
    assert.ok(storyState, 'Debe inicializar el estado de la historia');
    assert.strictEqual(storyState.currentStepIndex, 0);
    const currentStep = storyEngine.getCurrentStep(storyState);
    assert.strictEqual(currentStep?.type, 'dialogue');
  });

  test('Sincronización de pendingMinigame entre instrucciones y ejecución', () => {
    // Avanzar hasta un paso de instrucciones de minijuego aleatorio
    let currentStep = storyEngine.getCurrentStep(storyState);
    while (storyState && (!currentStep || currentStep.id !== 'instrucciones_minijuego_1') && !storyState.storyCompleted) {
      storyState = storyEngine.nextStep(storyState);
      currentStep = storyEngine.getCurrentStep(storyState);
    }
    assert.strictEqual(currentStep?.type, 'instructions');
    assert.ok(storyState.pendingMinigame, 'Debe haber seleccionado y guardado un pendingMinigame en las instrucciones');

    const expectedMinigame = storyState.pendingMinigame;

    // Avanzar al siguiente paso (debe ser el minijuego aleatorio)
    storyState = storyEngine.nextStep(storyState);
    currentStep = storyEngine.getCurrentStep(storyState);
    assert.strictEqual(currentStep?.type, 'minigame_random');
    assert.strictEqual(storyState.selectedMinigame, expectedMinigame, 'El minijuego ejecutado DEBE coincidir exactamente con el explicado en las instrucciones');
  });

  // 3. Pruebas de Catálogo de Minijuegos
  console.log('\n--- Pruebas de Catálogo y Módulos de Juego ---');

  test('Todos los minijuegos del catálogo están habilitados y configurados correctamente', () => {
    const games: GameInfo[] = GAME_CATALOG;
    assert.ok(games.length >= 12, 'Debe haber al menos 12 minijuegos registrados en el catálogo');
    
    games.forEach((g: GameInfo) => {
      assert.ok(g.id, `Minijuego sin ID`);
      assert.ok(g.name, `Minijuego ${g.id} sin nombre`);
      assert.ok((g.durationSeconds || 0) > 0 || g.mode === 'quiz', `Minijuego ${g.id} con configuración válida`);
    });
  });

  console.log('\n=========================================');
  console.log(`📊 RESUMEN DE PRUEBAS: ${passed} EXITOSAS | ${failed} FALLIDAS`);
  console.log('=========================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAutomatedTests();
