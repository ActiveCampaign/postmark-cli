var socket = io()

socket.on('change', function() {
  console.log('Templates changed. Reloading preview.')
  document.querySelector('.js-html').contentWindow.location.reload();
  document.querySelector('.js-text').contentWindow.location.reload();

  var reloaded = document.querySelector('.js-reloaded')
  reloaded.classList.add('is-active')

  setTimeout(function() {
    reloaded.classList.remove('is-active')
  }, 3000)
})

socket.on('subject', function(data) {
  var subjectEl = document.querySelector('.js-subject')
  var subjectErrorTooltip = document.querySelector('.js-subject-error');

  var errorTooltip = Popper.createPopper(subjectEl, subjectErrorTooltip, {
    placement: 'top-start',
  });

  if (!isEmptyObject(data)) {
    if (data.ContentIsValid) {
      // Render tooltip if valid
      subjectEl.classList.remove('has-error')
      subjectEl.textContent = data.RenderedContent

      // Destroy tooltip
      errorTooltip.destroy()
    } else {
      // Show validation error indicator
      subjectEl.classList.add('has-error')
      subjectEl.innerHTML = data.rawSubject + ' <span class="syntax-error">Syntax error</span>'

      // Append each validation error to tooltip
      var subjectError = document.querySelector('.js-subject-error')
      subjectError.innerHTML = ''
      data.ValidationErrors.forEach(function(error) {
        subjectError.innerHTML += '<p>' + error.Message + '</p>'
      })
    }
  }
})

function isEmptyObject(value) {
  return Object.keys(value).length === 0 && value.constructor === Object;
}
