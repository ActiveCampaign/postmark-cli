var html = document.querySelector('.js-html')
var toggles = document.querySelectorAll('.js-toggle-mode')
var activeToggleClass = 'toggle_item--active'

toggles.forEach(function(toggle) {
  toggle.addEventListener('click', function(event) {
    event.preventDefault()
    // Reset state
    resetMode()

    // Add active class
    this.classList.add(activeToggleClass)

    // Show preview
    document
      .querySelector('.js-' + this.dataset.mode)
      .classList.remove('hidden')
  })
})

function resetMode() {
  toggles.forEach(function(toggle) {
    toggle.classList.remove(activeToggleClass)
    document.querySelector('.js-' + toggle.dataset.mode).classList.add('hidden')
  })
}
