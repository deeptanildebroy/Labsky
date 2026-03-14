(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();


    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('bg-white shadow-sm').css('position', 'fixed').css('top', '-1px');
        } else {
            $('.sticky-top').removeClass('bg-white shadow-sm').css('position', 'absolute').css('top', '0');
        }
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({ scrollTop: 0 }, 1500, 'easeInOutExpo');
        return false;
    });

    // Career Form Submission
    $('#career-form').on('submit', function (e) {
        e.preventDefault();

        const form = $(this);
        const submitBtn = $('#submit-btn');
        const statusMsg = $('#form-status');
        const formData = new FormData(this);

        // Retrieve Cloudflare Turnstile Token
        const turnstileResponse = $('[name="cf-turnstile-response"]').val();
        if (!turnstileResponse) {
            statusMsg.show().addClass('text-danger').removeClass('text-success').text('Please complete the security challenge.');
            return;
        }
        formData.append("CaptchaToken", turnstileResponse);

        // UI Reset
        statusMsg.hide().removeClass('text-danger text-success').text('');
        submitBtn.prop('disabled', true).text('Sending...');

        // Perform Fetch
        // fetch('https://api.example.com/careers/apply', { // REPLACE with actual API URL
        //     method: 'POST',
        //     body: formData,
        //     headers: {
        //         'Accept': 'application/json'
        //         // No need for Content-Type when using FormData; browser sets it automatically with boundary
        //     }
        // })
        //     .then(response => {
        //         if (!response.ok) {
        //             throw new Error('Network response was not ok');
        //         }
        //         return response.json();
        //     })
        //     .then(data => {
        //         statusMsg.addClass('text-success').text('Application submitted successfully!').fadeIn();
        //         form.trigger('reset');
        //     })
        //     .catch(error => {
        //         console.error('Submission Error:', error);
        //         statusMsg.addClass('text-danger').text('There was an error submitting your application. Please try again.').fadeIn();
        //     })
        //     .finally(() => {
        //         submitBtn.prop('disabled', false).text('Submit Application');
        //     });
    });

})(jQuery);

