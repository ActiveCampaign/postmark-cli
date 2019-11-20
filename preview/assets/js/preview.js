var activeToggleClass = 'is-active'

/**
 * Mode toggles
 */
var mode = document.querySelectorAll('.js-mode')
var currentMode = 'html'

mode.forEach(function(toggle) {
  toggle.addEventListener('click', function(event) {
    event.preventDefault()

    // Reset all classes
    mode.forEach(function(modeToggle) {
      // Remove active class from all toggles
      modeToggle.classList.remove(activeToggleClass)

      // Hide all views
      document
        .querySelector('.js-' + modeToggle.dataset.mode)
        .classList.add('hidden')
    })

    // Add active class
    currentMode = this.dataset.mode
    this.classList.add(activeToggleClass)

    // Show view
    document
      .querySelector('.js-' + this.dataset.mode)
      .classList.remove('hidden')
  })
})

/**
 * View toggles
 */
var view = document.querySelectorAll('.js-view')
var currentView = 'desktop'

view.forEach(function(toggle) {
  // Add click event
  toggle.addEventListener('click', function(event) {
    event.preventDefault()

    view.forEach(function(viewToggle) {
      // Remove active class from all toggles
      viewToggle.classList.remove(activeToggleClass)

      document.querySelectorAll('.preview-iframe').forEach(function(item) {
        item.classList.remove('preview-iframe--mobile')
      })
    })

    currentView = this.dataset.view
    this.classList.add(activeToggleClass)

    if (this.dataset.view === 'mobile') {
      document.querySelectorAll('.preview-iframe').forEach(function(item) {
        item.classList.add('preview-iframe--mobile')
      })
    }
  })
})

function keypress(e) {
  var evt = window.event ? event : e

  // ctrl + v
  if (evt.keyCode == 86 && evt.ctrlKey) {
    var view = currentView === 'desktop' ? 'mobile' : 'desktop'
    document.querySelector('.js-view[data-view="' + view + '"]').click()
  }

  // ctrl + m
  if (evt.keyCode == 77 && evt.ctrlKey) {
    var mode = currentMode === 'html' ? 'text' : 'html'
    document.querySelector('.js-mode[data-mode="' + mode + '"]').click()
  }
}

document.onkeydown = keypress
