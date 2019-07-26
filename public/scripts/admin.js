var rejectButtons = document.querySelectorAll('.reject-claim-button')

function areYouSure(event) {
  event.target.setAttribute('class', 'reject-button')
  event.target.setAttribute('type', 'submit')
  event.target.textContent = 'Confirm rejection'
  var parent = event.target.parentNode
  var reason = document.createElement('input')
  reason.setAttribute('name', 'reason')
  parent.insertBefore(reason, event.target)
  var label = document.createElement('label')
  label.setAttribute('for', 'reason')
  label.textContent = 'Reason:'
  parent.insertBefore(label, reason)
  event.preventDefault()
  event.target.removeEventListener('click', areYouSure, false) // remove listener otherwise button submit event will never happen!
}

rejectButtons.forEach(element => {
  element.addEventListener('click', areYouSure, false)
});