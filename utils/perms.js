// Verifica se um membro é staff por permissão ou cargo específico
const STAFF_CARGO_IDS = ['1518773740295422042']; // IDs de cargos considerados staff

function isStaff(member) {
  if (!member) return false;
  // Permissões padrão de admin/staff
  const temPermissao = member.permissions?.has('Administrator') || member.permissions?.has('ManageGuild');
  if (temPermissao) return true;
  // Verifica nos cargos do membro
  const cargos = member.roles?.cache || [];
  return cargos.some((r) => STAFF_CARGO_IDS.includes(r.id));
}

module.exports = { isStaff };