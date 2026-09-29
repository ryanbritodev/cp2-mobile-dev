import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { publicIdFor, signParams } from '../src/services/cloudinary';

describe('signParams', () => {
  it('gera a assinatura do exemplo da documentação do Cloudinary', () => {
    const signature = signParams(
      { timestamp: '1315060510', public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' },
      'abcd',
    );
    assert.equal(signature, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});

describe('publicIdFor', () => {
  it('define o caminho no servidor a partir do usuário autenticado ou do grupo', () => {
    assert.equal(publicIdFor({ kind: 'user-avatar' }, 'uid1'), 'chat-firebase/users/uid1/avatar');
    assert.equal(publicIdFor({ kind: 'group-photo', groupId: 'g1' }, 'uid1'), 'chat-firebase/groups/g1/photo');
  });
});
