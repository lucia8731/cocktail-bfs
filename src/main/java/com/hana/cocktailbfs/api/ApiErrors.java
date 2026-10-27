package com.hana.cocktailbfs.api;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler({IllegalArgumentException.class, ConstraintViolationException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ProblemDetail> badRequest(Exception exception) {
        String detail = exception instanceof MethodArgumentNotValidException ? "Invalid request fields. Check pantry, filters, and k (1–24)." : exception.getMessage();
        return ResponseEntity.badRequest().body(ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail));
    }
}
