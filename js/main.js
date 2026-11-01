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


    // Sticky Navbar shadow on scroll
    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('.sticky-top').addClass('shadow');
        } else {
            $('.sticky-top').removeClass('shadow');
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
            $('.back-to-top').addClass('show');
        } else {
            $('.back-to-top').removeClass('show');
        }
    });
    $('.back-to-top').click(function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Mobile Dropdown Submenu Toggle
    $('.dropdown-submenu > a').on('click', function (e) {
        if ($(window).width() < 992) {
            e.preventDefault();
            e.stopPropagation();
            $(this).parent('.dropdown-submenu').toggleClass('show');
        }
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
        fetch('https://api.example.com/careers/apply', { // REPLACE with actual API URL
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
                // No need for Content-Type when using FormData; browser sets it automatically with boundary
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                statusMsg.addClass('text-success').text('Application submitted successfully!').fadeIn();
                form.trigger('reset');
            })
            .catch(error => {
                console.error('Submission Error:', error);
                statusMsg.addClass('text-danger').text('There was an error submitting your application. Please try again.').fadeIn();
            })
            .finally(() => {
                submitBtn.prop('disabled', false).text('Submit Application');
            });
    });

})(jQuery);

